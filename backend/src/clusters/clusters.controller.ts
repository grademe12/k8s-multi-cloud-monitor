mport { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clusters')
@UseGuards(JwtAuthGuard)
export class ClustersController {
  constructor(private readonly clustersService: ClustersService) {}

  @Post()
  async create(
    @Body() dto: {
      name: string;
      provider: string;
      apiEndpoint: string;
      region: string;
      version?: string;
      token: string;
    },
    @Request() req,
  ) {
    return this.clustersService.create({
      ...dto,
      userId: req.user.id,
    });
  }

  @Get()
  async findAll(@Request() req) {
    return this.clustersService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.clustersService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<Cluster>,
    @Request() req,
  ) {
    return this.clustersService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.clustersService.remove(id, req.user.id);
  }
}