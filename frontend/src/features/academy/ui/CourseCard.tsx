import React from 'react';
import { Card } from '@/shared/ui/card';
import { CourseCardHeader } from './CourseCardHeader';
import { CourseCardBody } from './CourseCardBody';
import { cn } from '@/shared/ui/cn';
import { surfaceCard, type CourseWithProgress } from './courseVisuals';

interface CourseCardProps {
  course: CourseWithProgress;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const href = `/instructor/courses/${course.slug}`;

  return (
    <Card
      className={cn(
        'group focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        surfaceCard
      )}
    >
      <CourseCardHeader course={course} href={href} />
      <CourseCardBody course={course} href={href} />
    </Card>
  );
};

export default CourseCard;
