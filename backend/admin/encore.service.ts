import { Service } from "encore.dev/service";

// This service is automatically protected by the admin gateway defined in auth.ts
// because they are in the same service directory.
export default new Service("admin");
