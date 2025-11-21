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
import { TagService } from "../tags/tag/services/tag.service";

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
    id: string
    // page: number = 1,
    // limit: number = 10,
  ): Promise<{ projects: any[]; total: number; algorithm: string }> {
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
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    //const tags = await this.tagService

    // Debug: Log user interests
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

    // prototype (not functional) -> include users with their interests into the recommendations
    // const userProgramIds = user.studyPrograms ? user.studyPrograms.map((program: any) => program._id.toString()) : [];

    console.log("DEBUG - User Tag IDs:", userTagIds);
    console.log("DEBUG - User Course IDs:", userCourseIds);
    // console.log('DEBUG - User Study Program IDs:', userProgramIds);

    // Get all non-draft projects (excluding user's own projects and already liked)
    const allProjects = await this.projectModel
      .find({
        isDraft: false,
        owner: { $ne: new Types.ObjectId(userId) },
        _id: { $nin: likedProjectIds.map((id) => new Types.ObjectId(id)) },
      })
      .populate("tags")
      .populate("courses")
      .populate("owner", "_id firstName lastName email userType")
      .populate("thumbnail")
      .lean();

    // prototype (not functional) -> include users with their interests into the recommendations
    // const allUsers = await this.userModel.find()
    //   .populate('firstName')
    //   .populate('lastName')
    //   .populate('interestedTags')
    //   .populate('interestedCourses')
    //   .populate('studyPrograms')
    //   .lean();

    // console.log('DEBUG - Total projects found:', allProjects.length);
    // console.log('DEBUG - First 3 projects tags:', allProjects.slice(0, 3).map(p => ({
    //   title: (p as any).title,
    //   tags: (p as any).tags.map((t: any) => t.name || t._id)
    // })));

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

    // prototype (not functional) -> include users with their interests into the recommendations
    // const usersWithScores = allUsers.map(user => {
    //   const userTagIds = user.interestedTags ? user.interestedTags.map((tag: any) => tag._id.toString()) : [];
    //   const userCourseIds = user.interestedCourses ? user.interestedCourses.map((course: any) => course._id.toString()) : [];
    //   const userProgramIds = user.studyPrograms ? user.studyPrograms.map((program: any) => program._id.toString()) : [];

    //   return {
    //     ...user,
    //     tagIds: userTagIds,
    //     courseIds: userCourseIds,
    //     programIds: userProgramIds,
    //   };
    // });

    // Sort by score (highest first)
    projectsWithScores.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    // Pagination - not needed right now
    // const skip = (page - 1) * limit;
    // const paginatedProjects = projectsWithScores.slice(skip, skip + limit);
    const total = projectsWithScores.length;

    // console.log('DEBUG - For you - content-based:', paginatedProjects);
    console.log("DEBUG - For you - content-based:", projectsWithScores);

    return {
      //projects: paginatedProjects,
      projects: projectsWithScores,
      total,
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
}
