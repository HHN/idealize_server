import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { TagService } from '../services/tag.service';
import { CreateTagDto, EditTagDto } from '../dtos/tag.dto';
import { Tag } from '../schemas/tag.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAdminAuthGuard } from 'src/auth/jwt.guard';

@ApiTags('👑 Tags (admin access)')
@Controller('admin/tags')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminTagController {
    constructor(private readonly tagService: TagService) { }

    @Post('new')
    @ApiOperation({
        summary: 'This endpoint creates a tag',
        description: 'This endpoint creates a tag',
    })
    @ApiBody({ type: CreateTagDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
        return this.tagService.create(createTagDto);
    }

    @Post('new/bulk')
    @ApiOperation({
        summary: 'This endpoint creates multiple tags',
        description: 'This endpoint creates multiple tags',
    })
    @ApiBody({ type: [CreateTagDto] })
    @UsePipes(new ValidationPipe({ transform: true }))
    async createBulk(@Body() createTagDto: CreateTagDto[]): Promise<Tag[]> {
        return this.tagService.createBulk(createTagDto);
    }

    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all of the tags',
        description: 'This endpoint returns all of the tags',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findAll(@Query() query): Promise<Tag[]> {
        return this.tagService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'This endpoint returns an specific tag based on its :id',
        description: 'This endpoint returns an specific tag based on its :id',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findOne(@Param('id') id: string): Promise<Tag> {
        return this.tagService.findById(id);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'This endpoint deletes an specific tag based on its :id',
        description: 'This endpoint deletes an specific tag based on its :id',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async remove(@Param('id') id: string): Promise<Tag> {
        return this.tagService.delete(id);
    }

    @Put(':id')
    @ApiBody({ type: EditTagDto })
    @ApiOperation({
        summary: 'This endpoint edits an specific tag based on its :id',
        description: 'This endpoint edits an specific tag based on its :id',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async edit(@Param('id') id: string, @Body() editTagDto: Partial<EditTagDto>): Promise<Tag> {
        return this.tagService.edit(id, editTagDto);
    }
}
