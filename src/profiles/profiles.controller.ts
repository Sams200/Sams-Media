import {
  Body, Controller, DefaultValuePipe, Get, NotFoundException,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service.js';
import { CreateUserProfileDto } from './dto/create-user-profile.dto.js';
import { UpdateBioDto } from './dto/update-bio.dto.js';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('by-username/:username')
  @ApiOperation({ summary: 'Full profile by unique username (index)' })
  async byUsername(@Param('username') username: string) {
    const p = await this.service.byUsername(username);
    if (!p) throw new NotFoundException();
    return p;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full profile by id (point read)' })
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.service.byId(id);
    if (!p) throw new NotFoundException();
    return p;
  }

  @Get()
  @ApiOperation({ summary: 'Search by interest, or paginate (created_at desc, keyset cursor via `after`) when no interest given' })
  @ApiQuery({ name: 'interest', required: false, type: String, description: 'A single User Interest' })
  @ApiQuery({ name: 'after', required: false, type: String, description: 'Cursor id of the last profile from the previous page' })
  search(
    @Query('interest') interest?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('after', new ParseUUIDPipe({ optional: true })) after?: string,
  ) {
    if (interest) return this.service.byInterest(interest, limit!);
    return this.service.page(offset!, limit!, after);
  }

  @Post()
  create(@Body() dto: CreateUserProfileDto) {
    return this.service.create(dto);
  }

  @Patch(':id/bio')
  @ApiOperation({ summary: 'Single-field update' })
  async updateBio(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBioDto) {
    const ok = await this.service.updateBio(id, dto.bio);
    if (!ok) throw new NotFoundException();
    return { updated: true };
  }
}