import {
  Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JsonRequestGuard } from '../common/http/json-request.guard';
import { InputType } from '../contracts/analysis.enums';
import { AnalysisRateLimitGuard } from './analysis-rate-limit.guard';
import { AnalysisService } from './analysis.service';
import type { AnalysisResponseDto } from './dto/analysis-response.dto';
import { TextRequestDto } from './dto/text-request.dto';
import { receiveImages } from './image-upload';

@Controller('analysis')
@UseGuards(AnalysisRateLimitGuard)
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JsonRequestGuard)
  analyzeText(@Body() body: TextRequestDto): Promise<AnalysisResponseDto> {
    return this.analysis.analyze({ inputType: InputType.TEXT, text: body.text });
  }

  @Post('images')
  @HttpCode(HttpStatus.OK)
  async analyzeImages(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AnalysisResponseDto> {
    const { images, context } = await receiveImages(request, response);
    return this.analysis.analyze({ inputType: InputType.IMAGE, images, context });
  }
}
