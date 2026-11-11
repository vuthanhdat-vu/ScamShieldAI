import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JsonRequestGuard } from '../common/http/json-request.guard';
import { EmergencyRequestDto, type EmergencyResponseDto } from './dto/emergency.dto';
import { GuidanceService } from './guidance.service';

@Controller('guidance')
export class GuidanceController {
  constructor(private readonly guidance: GuidanceService) {}

  @Post('emergency')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JsonRequestGuard)
  getEmergencyGuidance(@Body() body: EmergencyRequestDto): EmergencyResponseDto {
    return this.guidance.forScenario(body.scenario);
  }
}
