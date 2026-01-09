import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { TeamMember } from "@shared/schema";


const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

import MemoryStoreFactory from "memorystore";
import pgSession from "connect-pg-simple";

export async function setupAuth(app: Express) {
    let store;
    const secret = process.env.SESSION_SECRET || "fazza-secret-key-replit";

    // if (process.env.DATABASE_URL) {
    //     // Production: Use PostgreSQL session store
    //     const PgStore = pgSession(session);
    //     const { pool } = await import("./db.pg");
    //     store = new PgStore({
    //         pool,
    //         tableName: 'session',
    //         createTableIfMissing: true
    //     });
    // } else {
    // Development/Local: Use MemoryStore (better than default MemoryStore)
    const MemoryStore = MemoryStoreFactory(session);
    store = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    });
    // }

    const sessionSettings: session.SessionOptions = {
        secret,
        resave: false,
        saveUninitialized: false,
        store,
        cookie: {
            secure: app.get("env") === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        }
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getTeamMemberByEmail(username);
                if (!user) {
                    return done(null, false, { message: "Invalid username or password" });
                }

                // If user has no password (legacy), allow login if password matches default or update it
                // For now, we assume all users have passwords or we set a default
                if (!user.password) {
                    // This case should be handled by migration, but just in case
                    return done(null, false, { message: "User has no password set" });
                }

                const isValid = await comparePasswords(password, user.password);
                if (!isValid) {
                    return done(null, false, { message: "Invalid username or password" });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as TeamMember).id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await storage.getTeamMember(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: TeamMember, info: any) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(401).json({ message: info?.message || "Authentication failed" });
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                return res.json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                });
            });
        })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            res.json({ message: "Logged out successfully" });
        });
    });

    app.get("/api/user", (req, res) => {
        if (req.isAuthenticated()) {
            const user = req.user as TeamMember;
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
            });
        } else {
            res.status(401).json({ message: "Not authenticated" });
        }
    });
}

export { hashPassword };
