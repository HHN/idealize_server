import { LikeProject } from "../schemas/like-project.schema";

// Likes are generated dynamically in the seeding service based on users and projects.
// Each user will like at least 3 different projects.
export const LikesMock: LikeProject[] = [];
