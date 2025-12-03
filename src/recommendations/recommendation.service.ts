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
   * Baseline Filtering: Not personalized approach. Recommending projects ranked by popularity (likes)
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
    limit: number = 10,
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
        emptyStateMessage: "Please add interests to your profile to get personalized recommendations. Go to Settings > Edit Profile to add tags and courses you're interested in.",
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
      ...userTagIds.map(id => new Types.ObjectId(id)),
      ...userCourseIds.map(id => new Types.ObjectId(id)),
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
      console.log("No projects match your interests yet. Try adding more tags or courses to your profile, or check back later for new projects.")
      return {
        projects: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        algorithm: "content-based",
        emptyStateReason: "no_matching_projects",
        emptyStateMessage: "No projects match your interests yet. Try adding more tags or courses to your profile, or check back later for new projects.",
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
        tagScore * 0.5 + // 50% weight on tag matching
        courseScore * 0.3 + // 30% weight on course matching
        recencyScore * 0.2; // 20% weight on recency

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
}
