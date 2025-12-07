import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { Project, ProjectDocument } from 'src/projects/project/schemas/project.schema';
import { Tag, TagDocument } from 'src/tags/tag/schemas/tag.schema';
import { tagsMock } from 'src/tags/tag/seed/tag.seed';
import { User, UserDocument } from 'src/users/user/schemas/user.schema';
import { usersMock } from 'src/users/user/seed/user.seed';
import { ObjectId } from 'mongodb';
import { CreateTagDto } from 'src/tags/tag/dtos/tag.dto';
import { ProjectsMock } from 'src/projects/project/seed/projects.seed';
import { Report, ReportDocument } from 'src/reports/report/schemas/report.schema';
import { Comment, CommentDocument } from 'src/comments/comment/schemas/comment.schema';
import { ReportsMock } from 'src/reports/report/seed/reports.seed';
import { CommentsMock } from 'src/comments/comment/seed/comments.seed';
import { LikeProject, LikeProjectDocument } from 'src/likes/like/schemas/like-project.schema';

@Injectable()
export class SeedingService {
    constructor(
        @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
        @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
        @InjectModel(LikeProject.name) private likeProjectModel: Model<LikeProjectDocument>,
        private readonly authService: AuthService,
    ) { }

    async tagsMockup(): Promise<Tag[]> {
        await this.tagModel.deleteMany({ isMockData: true }).exec();
        return await this.tagModel.insertMany(tagsMock.map(tag => {
            return {
                name: tag.name,
                type: tag.type,
                userId: null,
                isMockData: true,
            }
        }));

    }

    async reportsMockup(): Promise<any> {
        await this.reportModel.deleteMany({ isMockData: true }).exec();

        const allUsers = await this.userModel.find<UserDocument>().exec();
        const allProjects = await this.projectModel.find<ProjectDocument>().exec();

        ReportsMock.map(report => {
            report.userId = allUsers[Math.floor(Math.random() * allUsers.length)]._id as ObjectId;
            report.projectId = allProjects[Math.floor(Math.random() * allProjects.length)]._id as ObjectId;
            report.reportedUser = allUsers[Math.floor(Math.random() * allUsers.length)]._id as ObjectId;
            report.isMockData = true;
        });

        return await this.reportModel.insertMany(ReportsMock);
    }

    async commentsMockup(): Promise<any> {
        const allUsers = await this.userModel.find<UserDocument>().exec();
        const allProjects = await this.projectModel.find<ProjectDocument>().exec();

        CommentsMock.map(comment => {
            comment.userId = allUsers[Math.floor(Math.random() * allUsers.length)]._id as ObjectId;
            comment.projectId = allProjects[Math.floor(Math.random() * allProjects.length)]._id as ObjectId;
            comment.parentCommentId = (Math.floor(Math.random()) % 2) === 0 ? null : allProjects[Math.floor(Math.random() * allProjects.length)]._id as ObjectId;
            comment.isMockData = true;
        });

        return await this.commentModel.insertMany(CommentsMock);
    }

    async usersMockup(): Promise<User[]> {
        await this.userModel.deleteMany({ isMockData: true }).exec();
        const allTags = await this.tagModel.find<TagDocument>().exec();

        if (!allTags ||
            allTags.findIndex(tag => tag.type === 'tag') === -1 ||
            allTags.findIndex(tag => tag.type === 'studyProgram') === -1 ||
            allTags.findIndex(tag => tag.type === 'course') === -1) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Tag not found',
                    message: 'Tag not found',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        const allTagsIds = allTags.filter(tag => tag.type === 'tag').map(tag => tag._id as ObjectId);
        const allCoursesIds = allTags.filter(tag => tag.type === 'course').map(tag => tag._id as ObjectId);
        const allStudyProgramsIds = allTags.filter(tag => tag.type === 'studyProgram').map(tag => tag._id as ObjectId);

        usersMock.map(user => {
            user.password = this.authService.hashPassword(user.password);
            user.studyPrograms = [
                allStudyProgramsIds[Math.floor(Math.random() * allStudyProgramsIds.length)],
            ];
            user.interestedTags = [
                allTagsIds[Math.floor(Math.random() * allTagsIds.length)],
                allTagsIds[Math.floor(Math.random() * allTagsIds.length)],
                allTagsIds[Math.floor(Math.random() * allTagsIds.length)],
            ];
            user.interestedCourses = [
                allCoursesIds[Math.floor(Math.random() * allCoursesIds.length)],
            ];
            user.profilePicture = null;
            user.isMockData = true;
        });

        return await this.userModel.insertMany(usersMock);
    }

    async projectsMockup(): Promise<Project[]> {
        await this.projectModel.deleteMany({ isMockData: true }).exec();
        const allTags = await this.tagModel.find<TagDocument>().exec();
        const allUsers = await this.userModel.find<UserDocument>().exec();

        if (!allTags ||
            allTags.findIndex(tag => tag.type === 'tag') === -1 ||
            allTags.findIndex(tag => tag.type === 'studyProgram') === -1 ||
            allTags.findIndex(tag => tag.type === 'course') === -1) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Tag not found',
                    message: 'Tag not found',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        const allTagsIds = allTags.filter(tag => tag.type === 'tag').map(tag => tag._id as ObjectId);
        const allCoursesIds = allTags.filter(tag => tag.type === 'course').map(tag => tag._id as ObjectId);
        // const allStudyProgramsIds = allTags.filter(tag => tag.type === 'studyProgram').map(tag => tag._id as ObjectId);

        if (!allUsers || allUsers.length === 0) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Users not found',
                    message: 'Please seed users first before seeding projects',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        ProjectsMock.map(project => {
            project.tags = [
                allTagsIds[Math.floor(Math.random() * allTagsIds.length)],
                allTagsIds[Math.floor(Math.random() * allTagsIds.length)],
            ],
                project.courses = [
                    allCoursesIds[Math.floor(Math.random() * allCoursesIds.length)],
                ],
                project.owner = allUsers[Math.floor(Math.random() * allUsers.length)]._id as ObjectId,
                project.isMockData = true;
        });

        return await this.projectModel.insertMany(ProjectsMock);
    }

    async likesMockup(): Promise<LikeProject[]> {
        await this.likeProjectModel.deleteMany({ isMockData: true }).exec();
        
        const allUsers = await this.userModel.find<UserDocument>({ isMockData: true }).exec();
        const allProjects = await this.projectModel.find<ProjectDocument>({ isMockData: true }).exec();

        if (!allUsers || allUsers.length === 0) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Users not found',
                    message: 'Please seed users first before seeding likes',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        if (!allProjects || allProjects.length === 0) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Projects not found',
                    message: 'Please seed projects first before seeding likes',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        const likesToCreate: LikeProject[] = [];
        const minLikesPerUser = 3;

        // For each user, create at least 3 likes to different projects
        allUsers.forEach(user => {
            const userId = user._id as ObjectId;
            const likedProjectIds = new Set<string>();

            // Ensure minimum 3 likes per user
            const numberOfLikes = Math.max(
                minLikesPerUser,
                Math.floor(Math.random() * 8) + 3 // Random between 3 and 10 likes
            );

            // Create likes for random projects (excluding own projects)
            const availableProjects = allProjects.filter(
                project => project.owner.toString() !== userId.toString()
            );

            if (availableProjects.length === 0) {
                return; // Skip if user owns all projects
            }

            for (let i = 0; i < numberOfLikes && likedProjectIds.size < availableProjects.length; i++) {
                let randomProject;
                let attempts = 0;
                
                // Try to find a project that hasn't been liked yet
                do {
                    randomProject = availableProjects[Math.floor(Math.random() * availableProjects.length)];
                    attempts++;
                } while (likedProjectIds.has(randomProject._id.toString()) && attempts < 100);

                // Only add if not already liked
                if (!likedProjectIds.has(randomProject._id.toString())) {
                    likedProjectIds.add(randomProject._id.toString());
                    
                    likesToCreate.push({
                        userId: userId,
                        projectId: randomProject._id as ObjectId,
                        isMockData: true,
                    } as LikeProject);
                }
            }
        });

        console.log(`Creating ${likesToCreate.length} likes for ${allUsers.length} users`);
        return await this.likeProjectModel.insertMany(likesToCreate);
    }

    async clearAllSeeds(): Promise<any> {
        await this.tagModel.deleteMany({ isMockData: true }).exec();
        await this.userModel.deleteMany({ isMockData: true }).exec();
        await this.projectModel.deleteMany({ isMockData: true }).exec();
        await this.reportModel.deleteMany({ isMockData: true }).exec();
        await this.commentModel.deleteMany({ isMockData: true }).exec();
        await this.likeProjectModel.deleteMany({ isMockData: true }).exec();

        throw new HttpException(
            {
                status: HttpStatus.OK,
                message: 'All seeds deleted',
            },
            HttpStatus.OK,
        );
    }

    async _checkMockupExists(): Promise<boolean> {
        const allTags = await this.tagModel.find<TagDocument>({ isMockData: true }).exec();
        const allUsers = await this.userModel.find<UserDocument>({ isMockData: true }).exec();
        const allProjects = await this.projectModel.find<ProjectDocument>({ isMockData: true }).exec();
        const allLikes = await this.likeProjectModel.find<LikeProjectDocument>({ isMockData: true }).exec();

        return allTags.length > 0 || allUsers.length > 0 || allProjects.length > 0 || allLikes.length > 0;
    }
}
