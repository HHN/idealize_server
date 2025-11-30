import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Project,
  ProjectDocument,
} from "../projects/project/schemas/project.schema";
import { User, UserDocument } from "../users/user/schemas/user.schema";
import { LikeProject } from "../likes/like/schemas/like-project.schema";
import {
  Recommendation,
  RecommendationDocument,
} from "./recommendation/schemas/recommendation.schema";
import { AuthService } from "../auth/auth.service";

export const tagWeight = 0.5;
export const courseWeight = 0.3;
export const studyProgramWeight = 0.2;

@Injectable()
export class RecommendationService {
  constructor(
    @InjectModel("Project")
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
    //@Injectable('TagService') private readonly tagService: TagService,
    @InjectModel("LikeProject")
    private readonly likeProjectModel: Model<LikeProject>,
    @InjectModel("Recommendation")
    private readonly recommendationModel: Model<RecommendationDocument>,
    private readonly authService: AuthService
  ) {}

  /**
   * Content-Based Filtering: Recommendations based on user's interested tags and courses
   */
  async getContentBasedRecommendations(
    token: string,
    id: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    projects: any[]; // any[] because Project[] wont have the field "_id"
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    algorithm: string;
    emptyStateReason?: string;
    emptyStateMessage?: string;
  }> {
    // Decode JWT to get user ID
    const jwtUser = await this.authService.decodeJWT(token);
    console.log("DEBUG - Decoded JWT User:", jwtUser, "token: ", token);
    const userId = jwtUser.userId;
    const userName = jwtUser.name;

    // Get user profile with interests
    const user = await this.userModel
      .findById(id) // changed from jwtUser.userId to id
      .populate("interestedTags")
      .populate("interestedCourses")
      .populate("studyPrograms")
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    // Debug: Log user interests
    // if Debugs showing empty update the reference ids in the userprofile with existing ids
    console.log("DEBUG - User ID:", userId);
    console.log("DEBUG - User Name:", user.username);
    console.log("DEBUG - User interestedTags:", user.interestedTags);
    console.log("DEBUG - User interestedCourses:", user.interestedCourses);
    console.log("DEBUG - User studyprograms:", user.studyPrograms);

    // Get user's liked projects to exclude them
    const likedProjects = await this.likeProjectModel
      .find({ userId: new Types.ObjectId(userId) })
      .select("projectId")
      .lean();
    const likedProjectIds = likedProjects.map((like) =>
      like.projectId.toString()
    );

    // Extract user's interested tags, course IDs, and study program IDs
    const userTagIds = user.interestedTags
      ? user.interestedTags.map((tag: any) => tag._id.toString())
      : [];
    const userCourseIds = user.interestedCourses
      ? user.interestedCourses.map((course: any) => course._id.toString())
      : [];

    console.log("DEBUG - User Tag IDs:", userTagIds);
    console.log("DEBUG - User Course IDs:", userCourseIds);

    // Check if user has any interests defined
    if (userTagIds.length === 0 && userCourseIds.length === 0) {
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "content-based",
        emptyStateReason: "no_interests",
        emptyStateMessage:
          "Please add interests to your profile to get personalized recommendations. Go to Settings > Edit Profile to add tags and courses you're interested in.",
      };
    }

    // Build query to only include projects that match at least one user interest
    const matchQuery: any = {
      isDraft: false,
      owner: { $ne: new Types.ObjectId(userId) },
      _id: { $nin: likedProjectIds.map((id) => new Types.ObjectId(id)) },
    };

    // Only include projects that have at least one matching tag, course, or study program
    const userInterestIds = [
      ...userTagIds.map((id) => new Types.ObjectId(id)),
      ...userCourseIds.map((id) => new Types.ObjectId(id)),
    ];

    if (userInterestIds.length > 0) {
      matchQuery.$or = [
        { tags: { $in: userInterestIds } },
        { courses: { $in: userInterestIds } },
      ];
    }

    // Get only projects that match user's interests
    const allProjects = await this.projectModel
      .find(matchQuery)
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .lean();

    // Check if no matching projects found
    if (allProjects.length === 0) {
      console.log(
        "No projects match your interests yet. Try adding more tags or courses to your profile, or check back later for new projects."
      );
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "content-based",
        emptyStateReason: "no_matching_projects",
        emptyStateMessage:
          "No projects match your interests yet. Try adding more tags or courses to your profile, or check back later for new projects.",
      };
    }

    // Calculate scores for each project
    const projectsWithScores = allProjects.map((project) => {
      const projectTagIds = (project.tags as any[]).map((tag: any) =>
        tag._id.toString()
      );
      const projectCourseIds = (project.courses as any[]).map((course: any) =>
        course._id.toString()
      );

      // Calculate tag overlap (Jaccard similarity)
      const tagIntersection = userTagIds.filter((tagId) =>
        projectTagIds.includes(tagId)
      ).length;
      const tagUnion = new Set([...userTagIds, ...projectTagIds]).size;
      const tagScore = tagUnion > 0 ? tagIntersection / tagUnion : 0;

      // Calculate course overlap
      const courseIntersection = userCourseIds.filter((courseId) =>
        projectCourseIds.includes(courseId)
      ).length;
      const courseUnion = new Set([...userCourseIds, ...projectCourseIds]).size;
      const courseScore =
        courseUnion > 0 ? courseIntersection / courseUnion : 0;

      // Recency score (newer projects get higher scores)
      const projectAge =
        Date.now() - new Date((project as any).createdAt).getTime();
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      const recencyScore = Math.max(0, 1 - projectAge / maxAge);

      // Combined score with weights
      const finalScore =
        tagScore * tagWeight + // 50% weight on tag matching
        courseScore * courseWeight + // 30% weight on course matching
        recencyScore * studyProgramWeight; // 20% weight on recency

      return {
        ...project,
        recommendationScore: finalScore,
      };
    });

    // Sort by score (highest first)
    projectsWithScores.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    const total = projectsWithScores.length;

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedProjects = projectsWithScores.slice(skip, skip + limit);

    // Debug pagination
    console.log("=== PAGINATION DEBUG ===");
    console.log("Page:", page, "Limit:", limit, "Skip:", skip);
    console.log("Total projects (filtered):", total);
    console.log("Returning projects:", paginatedProjects.length);
    console.log("Expected last page:", Math.ceil(total / limit));

    const hasMore = skip + paginatedProjects.length < total;
    console.log("Has more pages:", hasMore);

    return {
      projects: paginatedProjects,
      total,
      page,
      limit,
      hasMore,
      algorithm: "content-based",
    };
  }

  /**
   * Basic Filtering: Recommendations based on user's interested tags and courses (simpler approach)
   */
  async getBasicFilteredRecommendations(
    token: string,
    id: string
    // page: number = 1,
    // limit: number = 10,
  ): Promise<{ projects: any[]; total: number; algorithm: string }> {
    // Decode JWT to get user ID
    const jwtUser = await this.authService.decodeJWT(token);
    const userId = jwtUser.userId;

    // Get user profile with interests
    const user = await this.userModel
      // .findById(jwtUser.userId)
      .findById(id) // changed from jwtUser.userId to id
      .populate("interestedTags")
      .populate("interestedCourses")
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's liked projects to exclude them
    const likedProjects = await this.likeProjectModel
      // .find({ userId: new Types.ObjectId(userId) })
      .find({ userId: id }) // changed from jwtUser.userId to id
      .select("projectId")
      .lean();
    const likedProjectIds = likedProjects.map((like) =>
      like.projectId.toString()
    );

    // Extract user's interested tag and course IDs
    const userTagIds = user.interestedTags.map((tag: any) => tag._id);
    const userCourseIds = user.interestedCourses.map(
      (course: any) => course._id
    );

    // const skip = (page - 1) * limit;

    // Query projects that match user's interests
    const query: any = {
      isDraft: false,
      // owner: { $ne: new Types.ObjectId(userId) },
      // _id: { $nin: likedProjectIds.map(id => new Types.ObjectId(id)) },
      $or: [{ tags: { $in: userTagIds } }, { courses: { $in: userCourseIds } }],
    };

    // Get projects with populated fields
    const projects = await this.projectModel
      .find(query)
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .populate("teamMembers", "_id firstName lastName email userType")
      .sort({ createdAt: -1 }) // Most recent first
      // .skip(skip)
      // .limit(limit)
      .lean();

    const total = await this.projectModel.countDocuments(query);

    return {
      projects,
      total,
      algorithm: "basic-filtering",
    };
  }

  /**
   * Hybrid Approach: Combines content-based with popularity metrics
   */
  async getHybridRecommendations(
    token: string,
    id: string
    // page: number = 1,
    // limit: number = 10,
  ): Promise<{ projects: any[]; total: number; algorithm: string }> {
    // Get content-based recommendations (without pagination to calculate popularity)
    // const contentBased = await this.getContentBasedRecommendations(token, 1, 100); // pagination disabled
    const contentBased = await this.getContentBasedRecommendations(token, id);

    // Add popularity score based on likes
    const projectsWithPopularity = await Promise.all(
      contentBased.projects.map(async (project) => {
        const likesCount = await this.likeProjectModel.countDocuments({
          projectId: project._id,
        });

        // Normalize popularity score (max 1.0)
        const popularityScore = Math.min(likesCount / 10, 1.0);

        // Recalculate score with popularity
        const hybridScore =
          project.recommendationScore * 0.7 + // 70% content-based
          popularityScore * 0.3; // 30% popularity

        return {
          ...project,
          likesCount,
          recommendationScore: hybridScore,
        };
      })
    );

    // Sort by hybrid score
    projectsWithPopularity.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    // Pagination
    // const skip = (page - 1) * limit;
    // const paginatedProjects = projectsWithPopularity.slice(skip, skip + limit);
    const total = projectsWithPopularity.length;
    //console.log('DEBUG - For you - Hyprid:', paginatedProjects);
    console.log("DEBUG - For you - Hyprid:", projectsWithPopularity);

    return {
      // projects: paginatedProjects,
      projects: projectsWithPopularity,
      total,
      algorithm: "hybrid",
    };
  }

  /**
   * K-Nearest Neighbors (KNN): Recommends projects based on similar users' preferences
   */
  async getKnnRecommendations(
    token: string,
    id: string,
    k: number = 5
  ): Promise<{ projects: any[]; total: number; algorithm: string }> {
    // Decode JWT to get user ID
    const jwtUser = await this.authService.decodeJWT(token);
    const userId = jwtUser.userId;

    // Get target user with interests
    const targetUser = await this.userModel
      .findById(id)
      .populate("interestedTags")
      .populate("interestedCourses")
      .populate("studyPrograms")
      .lean();

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Extract target user's features
    const targetTagIds = targetUser.interestedTags
      ? targetUser.interestedTags.map((tag: any) => tag._id.toString())
      : [];
    const targetCourseIds = targetUser.interestedCourses
      ? targetUser.interestedCourses.map((course: any) => course._id.toString())
      : [];
    const targetProgramIds = targetUser.studyPrograms
      ? targetUser.studyPrograms.map((program: any) => program._id.toString())
      : [];

    // Get target user's liked projects
    const targetLikes = await this.likeProjectModel
      .find({ userId: new Types.ObjectId(id) })
      .select("projectId")
      .lean();
    const targetLikedProjectIds = new Set(
      targetLikes.map((like) => like.projectId.toString())
    );

    console.log("🔍 DEBUG KNN - Target User:", id);
    console.log("🔍 DEBUG KNN - Target Tags:", targetTagIds);
    console.log("🔍 DEBUG KNN - Target Courses:", targetCourseIds);
    console.log("🔍 DEBUG KNN - Target Programs:", targetProgramIds);
    console.log(
      "🔍 DEBUG KNN - Target Liked Projects:",
      targetLikedProjectIds.size
    );

    // Get all other users with their interests
    const allUsers = await this.userModel
      .find({ _id: { $ne: new Types.ObjectId(id) } })
      .populate("interestedTags")
      .populate("interestedCourses")
      .populate("studyPrograms")
      .lean();

    // Calculate similarity scores for each user
    const userSimilarities = allUsers.map((user) => {
      const userTagIds = user.interestedTags
        ? user.interestedTags.map((tag: any) => tag._id.toString())
        : [];
      const userCourseIds = user.interestedCourses
        ? user.interestedCourses.map((course: any) => course._id.toString())
        : [];
      const userProgramIds = user.studyPrograms
        ? user.studyPrograms.map((program: any) => program._id.toString())
        : [];

      // Cosine similarity for tags
      const tagIntersection = targetTagIds.filter((tagId) =>
        userTagIds.includes(tagId)
      ).length;
      const tagSimilarity =
        targetTagIds.length > 0 && userTagIds.length > 0
          ? tagIntersection / Math.sqrt(targetTagIds.length * userTagIds.length)
          : 0;

      // Cosine similarity for courses
      const courseIntersection = targetCourseIds.filter((courseId) =>
        userCourseIds.includes(courseId)
      ).length;
      const courseSimilarity =
        targetCourseIds.length > 0 && userCourseIds.length > 0
          ? courseIntersection /
            Math.sqrt(targetCourseIds.length * userCourseIds.length)
          : 0;

      // Cosine similarity for study programs
      const programIntersection = targetProgramIds.filter((programId) =>
        userProgramIds.includes(programId)
      ).length;
      const programSimilarity =
        targetProgramIds.length > 0 && userProgramIds.length > 0
          ? programIntersection /
            Math.sqrt(targetProgramIds.length * userProgramIds.length)
          : 0;

      // Combined similarity score
      const similarityScore =
        tagSimilarity * tagWeight + // 50% weight on tag matching
        courseSimilarity * courseWeight + // 30% weight on course matching
        programSimilarity * studyProgramWeight; // 20% weight on study program matching

      return {
        userId: user._id.toString(),
        username: user.username,
        similarityScore,
        tagIntersection,
        courseIntersection,
        programIntersection,
      };
    });

    // Sort by similarity and get top K neighbors
    userSimilarities.sort((a, b) => b.similarityScore - a.similarityScore);
    const kNearestNeighbors = userSimilarities
      .slice(0, k)
      .filter((u) => u.similarityScore > 0);

    console.log("🔍 DEBUG KNN - K Nearest Neighbors:", kNearestNeighbors);

    if (kNearestNeighbors.length === 0) {
      console.log(
        "🔍 DEBUG KNN - No similar users found, falling back to popular projects"
      );
      // Fallback: return popular projects if no similar users
      const popularProjects = await this.projectModel
        .find({ isDraft: false })
        .populate("tags")
        .populate("courses")
        .populate("owner", "_id firstName lastName email userType")
        .populate("thumbnail")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      return {
        projects: popularProjects.map((p) => ({
          ...p,
          recommendationScore: 0,
        })),
        total: popularProjects.length,
        algorithm: "knn-fallback",
      };
    }

    // Get liked projects from similar users
    const neighborUserIds = kNearestNeighbors.map(
      (n) => new Types.ObjectId(n.userId)
    );
    const neighborLikes = await this.likeProjectModel
      .find({ userId: { $in: neighborUserIds } })
      .lean();

    // Count weighted likes per project
    const projectScores = new Map<string, { score: number; count: number }>();

    neighborLikes.forEach((like) => {
      const projectId = like.projectId.toString();

      // Skip if target user already liked this project
      if (targetLikedProjectIds.has(projectId)) {
        return;
      }

      // Find the similarity score of the user who liked this project
      const neighbor = kNearestNeighbors.find(
        (n) => n.userId === like.userId.toString()
      );
      if (!neighbor) return;

      const currentData = projectScores.get(projectId) || {
        score: 0,
        count: 0,
      };
      projectScores.set(projectId, {
        score: currentData.score + neighbor.similarityScore,
        count: currentData.count + 1,
      });
    });

    console.log(
      "🔍 DEBUG KNN - Project Scores:",
      Array.from(projectScores.entries()).slice(0, 5)
    );

    // Get project details and calculate final scores
    const projectIds = Array.from(projectScores.keys()).map(
      (id) => new Types.ObjectId(id)
    );
    const projects = await this.projectModel
      .find({ _id: { $in: projectIds }, isDraft: false })
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .lean();

    // Attach scores and sort
    const projectsWithScores = projects.map((project) => {
      const projectId = project._id.toString();
      const scoreData = projectScores.get(projectId);

      // Average similarity score weighted by number of similar users who liked it
      const recommendationScore = scoreData
        ? (scoreData.score / k) * Math.log(1 + scoreData.count)
        : 0;

      return {
        ...project,
        recommendationScore,
        likedByNeighbors: scoreData?.count || 0,
      };
    });

    projectsWithScores.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    console.log(
      "🔍 DEBUG KNN - Final Recommendations:",
      projectsWithScores.length
    );

    return {
      projects: projectsWithScores,
      total: projectsWithScores.length,
      algorithm: "knn",
    };
  }
}
