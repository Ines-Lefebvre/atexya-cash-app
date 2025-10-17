import { SQLDatabase } from "encore.dev/storage/sqldb";

export const subscriptionDB = new SQLDatabase("subscription", {
  migrations: "./migrations",
});
