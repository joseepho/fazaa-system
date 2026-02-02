
import { db } from "../server/db";
import {
    complaints, notes, statusChanges, savedFilters, logs, notifications,
    evaluations, fieldTechnicians, dailyEvaluations, detailedEvaluations
} from "../shared/schema";
import { sql } from "drizzle-orm";

async function resetSystem() {
    console.log("Starting System Reset (Keeping Users)...");

    try {
        // Disable foreign keys to allow truncation in any order (if supported by driver, but for safety lets do delete in order)

        const safelyDelete = async (table: any, name: string) => {
            try {
                console.log(`Deleting ${name}...`);
                await db.delete(table);
            } catch (e: any) {
                if (e.message.includes("no such table")) {
                    console.log(`Table ${name} does not exist, skipping.`);
                } else {
                    console.error(`Failed to delete ${name}:`, e.message);
                }
            }
        };

        await safelyDelete(detailedEvaluations, "Detailed Evaluations");
        await safelyDelete(dailyEvaluations, "Daily Evaluations");
        await safelyDelete(evaluations, "Legacy Evaluations");
        await safelyDelete(notifications, "Notifications");
        await safelyDelete(logs, "Logs");
        await safelyDelete(savedFilters, "Saved Filters");
        await safelyDelete(statusChanges, "Status Changes");
        await safelyDelete(notes, "Notes");
        await safelyDelete(complaints, "Complaints");
        await safelyDelete(fieldTechnicians, "Field Technicians");

        console.log("System Reset Complete!");
    } catch (error) {
        console.error("Reset Failed:", error);
    }

    process.exit(0);
}

resetSystem();
