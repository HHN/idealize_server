import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { TagService } from '../services/tag.service';
import { CreateTagDto, EditTagDto } from '../dtos/tag.dto';
import { Tag } from '../schemas/tag.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAdminAuthGuard, JwtAdminOrUserAuthGuard, JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('tags')
export class TagController {
    constructor(private readonly tagService: TagService) { }

    @ApiTags('Tags')
    @Post('new')
    @ApiOperation({
        summary: 'This endpoint creates a tag',
        description: 'This endpoint creates a tag',
    })
    @ApiBody({ type: CreateTagDto })
    @UsePipes(new ValidationPipe({ transform: true }))
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
        return this.tagService.create(createTagDto);
    }

    @ApiTags('Tags')
    @Get()
    @ApiOperation({
        summary: 'This endpoint returns all of the tags',
        description: 'This endpoint returns all of the tags',
    })
    @UsePipes(new ValidationPipe({ transform: true }))
    async findAll(): Promise<Tag[]> {
        return this.tagService.findAll();
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
}
