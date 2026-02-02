
import { db } from "../server/db";
import { fieldTechnicians, detailedEvaluations, dailyEvaluations, evaluations, complaints } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function debugDelete() {
    const TECH_ID = 1; // ID mentioned in your error

    console.log(`Debug: Attempting to delete Technician ${TECH_ID}...`);

    try {
        // 1. Check constraints by trying to delete inside a transaction if possible, or just linearly
        console.log("1. Deleting dependent DetailedEvaluations...");
        await db.delete(detailedEvaluations).where(eq(detailedEvaluations.technicianId, TECH_ID));

        console.log("2. Deleting dependent DailyEvaluations...");
        await db.delete(dailyEvaluations).where(eq(dailyEvaluations.technicianId, TECH_ID));

        console.log("3. Deleting dependent Legacy Evaluations...");
        await db.delete(evaluations).where(eq(evaluations.technicianId, TECH_ID));

        console.log("4. Unlinking Complaints...");
        await db.update(complaints).set({ technicianId: null }).where(eq(complaints.technicianId, TECH_ID));

        console.log("5. Attempting to delete Field Technician...");
        const res = await db.delete(fieldTechnicians).where(eq(fieldTechnicians.id, TECH_ID)).returning();

        console.log("Result:", res);
        console.log("SUCCESS: Technician deleted.");

    } catch (error: any) {
        console.error("FAILED TO DELETE!");
        console.error("Error Message:", error.message);
        if (error.code) console.error("Error Code:", error.code);

        // Check Foreign Keys
        console.log("\n--- Checking detailed FK info (if available) ---");
        // SQLite specific pragma to see what references whom
        try {
            // This is a rough check, might not list incoming keys easily in simple SQL without parsing schema
            // But the error message usually says "FOREIGN KEY constraint failed"
        } catch (e) { }
    }

    process.exit(0);
}

debugDelete();
