import { SQLDatabase } from "encore.dev/storage/sqldb";

export const adminDB = new SQLDatabase("admin", {
  migrations: "./migrations",
});
