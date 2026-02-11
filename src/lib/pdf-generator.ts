// @ts-expect-error - jspdf types installed with package
import jsPDF from 'jspdf';

interface SwimPlan {
  targetPaceSec: number;
  estimatedTimeMin: number;
  strategy?: string;
}

interface BikePlan {
  targetPower: number;
  targetSpeedKph: number;
  intensityFactor: number;
  durationMinutes: number;
  tss: number;
  segments?: Array<any>;
}

interface RunPlan {
  targetPaceSec: number;
  estimatedTimeMin: number;
  firstHalf?: string;
  secondHalf?: string;
}

interface NutritionPlan {
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  timeline?: Array<any>;
}

interface TransitionPlan {
  t1_target?: number;
  t2_target?: number;
  checklists?: any;
}

interface WeatherData {
  tempC: number;
  humidity: number;
  windSpeedKph: number;
  windDir?: string;
  dewPoint?: number;
}

interface RaceCourse {
  raceName: string;
  distanceCategory: string;
  location?: string;
  raceYear?: number;
}

interface Athlete {
  ftpWatts?: number;
  thresholdPaceSec?: number;
}

interface RacePlan {
  id: string;
  raceDate: Date;
  predictedFinishSec?: number;
  weatherData?: WeatherData | null;
  swimPlan?: SwimPlan | null;
  bikePlan?: BikePlan | null;
  runPlan?: RunPlan | null;
  nutritionPlan?: NutritionPlan | null;
  transitionPlan?: TransitionPlan | null;
  weatherWarnings?: string[];
  course: RaceCourse;
  athlete?: Athlete | null;
}

const BRAND_COLOR = '#ea580c'; // Orange
const BRAND_RGB = { r: 234, g: 88, b: 12 };

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatPace(seconds: number, unit: string = 'km'): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}/${unit}`;
}

export async function generateRaceDayPdf(plan: RacePlan): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = margin;

  const swim = plan.swimPlan as SwimPlan | undefined;
  const bike = plan.bikePlan as BikePlan | undefined;
  const run = plan.runPlan as RunPlan | undefined;
  const nutrition = plan.nutritionPlan as NutritionPlan | undefined;
  const transition = plan.transitionPlan as TransitionPlan | undefined;
  const weather = plan.weatherData as WeatherData | undefined;
  const { course } = plan;

  // ─── Header Section ───
  doc.setFillColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('RaceDayAI', margin, 15);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text('RACE EXECUTION PLAN', margin, 23);

  // Race info on header right
  doc.setFontSize(9);
  const raceDate = new Date(plan.raceDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`${raceDate}`, pageWidth - margin - 40, 15);
  doc.text(`${course.distanceCategory.toUpperCase()}`, pageWidth - margin - 40, 23);

  yPos = 42;

  // ─── Race Title ───
  doc.setTextColor(0, 0, 0);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(course.raceName, margin, yPos);
  yPos += 8;

  if (course.location) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${course.location}`, margin, yPos);
    yPos += 6;
  }

  yPos += 2;

  // ─── Overview Cards ───
  const cardWidth = (pageWidth - margin * 2 - 4) / 3;
  const cardHeight = 28;

  // Finish Time Card
  drawCard(
    doc,
    margin,
    yPos,
    cardWidth,
    cardHeight,
    'FINISH TIME',
    formatTime(plan.predictedFinishSec || 0),
    ''
  );

  // Weather Card
  const weatherText = weather
    ? `${weather.tempC}°C | ${weather.humidity}% Humidity`
    : 'TBD';
  const weatherSubtext = weather && weather.tempC > 25 ? 'Heat Warning' : '';
  drawCard(
    doc,
    margin + cardWidth + 2,
    yPos,
    cardWidth,
    cardHeight,
    'WEATHER',
    weatherText,
    weatherSubtext
  );

  // Nutrition Card
  const nutritionText = nutrition ? `${nutrition.carbsPerHour}g/hr` : 'TBD';
  drawCard(
    doc,
    margin + (cardWidth + 2) * 2,
    yPos,
    cardWidth,
    cardHeight,
    'CARBS',
    nutritionText,
    nutrition ? `${nutrition.sodiumPerHour}mg Na` : ''
  );

  yPos += cardHeight + 6;

  // ─── Swim Section ───
  yPos = drawSection(doc, yPos, 'SWIM', [
    {
      label: 'Target Pace',
      value: swim ? formatPace(swim.targetPaceSec, '100m') : 'TBD',
    },
    {
      label: 'Time',
      value: swim ? formatTime(swim.estimatedTimeMin * 60) : 'TBD',
    },
    {
      label: 'Strategy',
      value: swim?.strategy || 'Steady effort. No fast start.',
    },
  ]);

  // ─── Bike Section ───
  yPos = drawSection(doc, yPos, 'BIKE', [
    {
      label: 'Target Power',
      value: bike ? `${bike.targetPower}W` : 'TBD',
    },
    {
      label: 'Target Speed',
      value: bike ? `${bike.targetSpeedKph} km/h` : 'TBD',
    },
    {
      label: 'Intensity',
      value: bike ? `${(bike.intensityFactor * 100).toFixed(0)}% FTP` : 'TBD',
    },
    {
      label: 'TSS',
      value: bike ? `${bike.tss}` : 'TBD',
    },
    {
      label: 'Duration',
      value: bike ? formatTime(bike.durationMinutes * 60) : 'TBD',
    },
  ]);

  // ─── Run Section ───
  yPos = drawSection(doc, yPos, 'RUN', [
    {
      label: 'Target Pace',
      value: run ? formatPace(run.targetPaceSec) : 'TBD',
    },
    {
      label: 'Time',
      value: run ? formatTime(run.estimatedTimeMin * 60) : 'TBD',
    },
    {
      label: 'Strategy',
      value: 'Negative split. Hold back first half.',
    },
  ]);

  // ─── Nutrition Timeline ───
  if (nutrition) {
    yPos = drawSection(doc, yPos, 'NUTRITION', [
      {
        label: 'Carbs/Hour',
        value: `${nutrition.carbsPerHour}g`,
      },
      {
        label: 'Sodium/Hour',
        value: `${nutrition.sodiumPerHour}mg`,
      },
      {
        label: 'Fluid/Hour',
        value: `${nutrition.fluidPerHour}ml`,
      },
    ]);
  }

  // ─── Transition Section ───
  if (transition) {
    const transitionData = [];
    if (transition.t1_target) {
      transitionData.push({
        label: 'T1 Target',
        value: `${transition.t1_target} min`,
      });
    }
    if (transition.t2_target) {
      transitionData.push({
        label: 'T2 Target',
        value: `${transition.t2_target} min`,
      });
    }
    if (transitionData.length > 0) {
      yPos = drawSection(doc, yPos, 'TRANSITIONS', transitionData);
    }
  }

  // ─── Weather Warnings ───
  if (plan.weatherWarnings && plan.weatherWarnings.length > 0) {
    if (yPos + 20 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.text('WEATHER WARNINGS', margin, yPos);
    yPos += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 50, 0);

    plan.weatherWarnings.forEach((warning) => {
      const lines = doc.splitTextToSize(warning, pageWidth - margin * 2 - 2);
      doc.text(lines, margin + 2, yPos);
      yPos += lines.length * 4 + 2;
    });

    yPos += 4;
  }

  // ─── Footer ───
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('Helvetica', 'normal');
  doc.text('Generated by RaceDayAI | racedayai.com', margin, pageHeight - 6);

  // Return as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  value: string,
  subtext: string
): void {
  // Card background
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(title, x + 2, y + 3);

  // Value
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(value, x + 2, y + 12);

  // Subtext
  if (subtext) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(subtext, x + 2, y + 18);
  }
}

function drawSection(
  doc: jsPDF,
  startY: number,
  title: string,
  data: Array<{ label: string; value: string }>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Check for page break
  if (startY + 20 > pageHeight - margin) {
    doc.addPage();
    startY = margin;
  }

  // Section title with line
  doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.setLineWidth(0.5);
  doc.line(margin, startY, pageWidth - margin, startY);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
  doc.text(title, margin, startY + 5);

  let yPos = startY + 8;

  // Data rows
  data.forEach((item, index) => {
    if (yPos + 5 > pageHeight - margin - 10) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(item.label + ':', margin + 2, yPos);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Check if value is long and needs wrapping
    const maxWidth = pageWidth - margin - 40;
    const lines = doc.splitTextToSize(item.value, maxWidth);
    doc.text(lines, pageWidth - margin - 30, yPos, { align: 'right' });

    yPos += lines.length * 4 + 3;
  });

  return yPos + 4;
}
