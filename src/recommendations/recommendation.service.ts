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
   * Baseline Filtering: Non-personalized approach. Recommending projects ranked by popularity (likes)
   */
  async getBasicRecommendations(
    token: string,
    id: string
    // page: number = 1,
    // limit: number = 10,
  ): Promise<{ projects: any[]; total: number; algorithm: string }> {
    // Decode JWT to get user ID
    const jwtUser = await this.authService.decodeJWT(token);
    const userId = jwtUser.userId;
    console.log("Basic filtering ON SERVER")
    // Query all non-draft projects excluding user's own projects
    const query: any = {
      isDraft: false,
      owner: { $ne: new Types.ObjectId(userId) },
    };
    
    // Get all projects with populated fields
    const allProjects = await this.projectModel
      .find(query)
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .populate("teamMembers", "_id firstName lastName email userType")
      .lean();

    // Get likes count for each project and sort by popularity
    const projectsWithLikes = await Promise.all(
      allProjects.map(async (project) => {
        const likesCount = await this.likeProjectModel.countDocuments({
          projectId: project._id,
        });

        return {
          ...project,
          likesCount,
        };
      })
    );

    // Sort by likes count (highest first)
    projectsWithLikes.sort((a, b) => b.likesCount - a.likesCount);

    const total = projectsWithLikes.length;

    return {
      projects: projectsWithLikes,
      total,
      algorithm: "popularity-based (non-personalized baseline)",
    };
  }

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
    // console.log("DEBUG - Decoded JWT User:", jwtUser, "token: ", token);
    const userId = jwtUser.userId;
    // const userName = jwtUser.name;
    console.log("Content-based filtering ON SERVER")
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
   * Collaborative Filtering: Recommendations based on user similarity using SVD-inspired approach
   * Uses user-item interaction matrix (likes) to find similar users
   */
  async getCollaborativeRecommendations(
    token: string,
    id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ 
    projects: any[]; 
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
    const userId = jwtUser.userId;
    console.log("Collaborative filtering ON SERVER")
    //console.log("\n=== COLLABORATIVE FILTERING (SVD-based) ===");
    //console.log("User ID:", userId);

    // Get all users and their liked projects
    const allLikes = await this.likeProjectModel
      .find()
      .select("userId projectId")
      .lean();

    // Get target user's liked projects
    const userLikes = allLikes
      .filter((like) => like.userId.toString() === userId)
      .map((like) => like.projectId.toString());

    console.log("User has liked", userLikes.length, "projects");

    if (userLikes.length === 0) {
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "collaborative-filtering",
        emptyStateReason: "no_interactions",
        emptyStateMessage: "Like some projects first to get personalized recommendations based on users with similar tastes.",
      };
    }

    // Build user-item matrix (sparse representation)
    const userProjectMap = new Map<string, Set<string>>();
    
    allLikes.forEach((like) => {
      const uid = like.userId.toString();
      const pid = like.projectId.toString();
      
      if (!userProjectMap.has(uid)) {
        userProjectMap.set(uid, new Set());
      }
      userProjectMap.get(uid)!.add(pid);
    });

    // Calculate user similarity using Jaccard similarity
    const similarities: Array<{ userId: string; similarity: number }> = [];
    const userLikesSet = new Set(userLikes);

    userProjectMap.forEach((otherUserLikes, otherUserId) => {
      // Skip self
      if (otherUserId === userId) return;

      // Calculate Jaccard similarity: intersection / union
      const intersection = [...userLikesSet].filter((pid) =>
        otherUserLikes.has(pid)
      ).length;
      
      const union = new Set([...userLikesSet, ...otherUserLikes]).size;
      const similarity = union > 0 ? intersection / union : 0;

      // Only consider users with at least some similarity
      if (similarity > 0) {
        similarities.push({ userId: otherUserId, similarity });
      }
    });

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    console.log("Found", similarities.length, "similar users");

    if (similarities.length === 0) {
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "collaborative-filtering",
        emptyStateReason: "no_similar_users",
        emptyStateMessage: "No users with similar tastes found yet. Try liking more projects to improve recommendations.",
      };
    }

    // Get top N similar users (e.g., top 10)
    const topSimilarUsers = similarities.slice(0, 10);
    console.log("Top similar users:", topSimilarUsers.length);

    // Collect projects liked by similar users (weighted by similarity)
    const projectScores = new Map<string, number>();

    topSimilarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarUserLikes = userProjectMap.get(similarUserId) || new Set();
      
      similarUserLikes.forEach((projectId) => {
        // Skip projects already liked by target user
        if (userLikesSet.has(projectId)) return;

        // Add weighted score based on similarity
        const currentScore = projectScores.get(projectId) || 0;
        projectScores.set(projectId, currentScore + similarity);
      });
    });

    console.log("Found", projectScores.size, "candidate projects");

    if (projectScores.size === 0) {
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "collaborative-filtering",
        emptyStateReason: "no_new_projects",
        emptyStateMessage: "You've already liked all projects that similar users enjoy. Check back later for new projects!",
      };
    }

    // Convert to array and sort by score
    const rankedProjects = Array.from(projectScores.entries())
      .map(([projectId, score]) => ({ projectId, score }))
      .sort((a, b) => b.score - a.score);

    // Get top project IDs for current page
    const skip = (page - 1) * limit;
    const projectIdsToFetch = rankedProjects
      .slice(skip, skip + limit)
      .map((p) => new Types.ObjectId(p.projectId));

    // Fetch project details
    const projects = await this.projectModel
      .find({
        _id: { $in: projectIdsToFetch },
        isDraft: false,
        owner: { $ne: new Types.ObjectId(userId) },
      })
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .lean();

    // Add scores and sort by original ranking
    const projectsWithScores = projects.map((project) => {
      const scoreData = rankedProjects.find(
        (p) => p.projectId === project._id.toString()
      );
      return {
        ...project,
        recommendationScore: scoreData?.score || 0,
      };
    });

    // Sort by score (maintain ranking)
    projectsWithScores.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    const total = rankedProjects.length;
    // const hasMore = skip + projectsWithScores.length < total;
    const hasMore = false;

    console.log("Returning", projectsWithScores.length, "projects");
    console.log("Total available:", total);
    console.log("Has more:", hasMore);

    return {
      projects: projectsWithScores,
      total,
      page,
      limit,
      hasMore,
      algorithm: "collaborative-filtering",
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
    console.log("Hybrid filtering ON SERVER")

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
}
