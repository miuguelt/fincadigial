import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { allCourses } from '@/features/academy/data';
import { useCourseProgress } from '@/features/academy/model/useCourseProgress';
import {
  GraduationCap,
  Clock,
  BookOpen,
  Heart,
  Activity,
  Award,
  ChevronRight,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  Heart,
  Activity,
  Award,
};

const colorMap: Record<string, string> = {
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

const CourseListPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAllProgress } = useCourseProgress();
  const allProgress = getAllProgress();

  const coursesWithProgress = useMemo(
    () =>
      allCourses.map((course) => {
        const progress = allProgress[course.id];
        const completed = progress?.completedLessons?.length || 0;
        const percentage =
          course.totalLessons > 0
            ? Math.round((completed / course.totalLessons) * 100)
            : 0;
        return { ...course, completed, percentage };
      }),
    [allProgress]
  );

  return (
    <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Centro de Capacitación
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completa los cursos para mejorar tus habilidades como instructor
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{allCourses.length} cursos disponibles</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coursesWithProgress.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/instructor/courses/${course.slug}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = iconMap[course.icon] || BookOpen;
                      return (
                        <div
                          className={`p-2 rounded-lg border ${
                            colorMap[course.color] || colorMap.indigo
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {course.totalLessons} lecciones • {course.totalDuration}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">
                      {course.completed}/{course.totalLessons} lecciones (
                      {course.percentage}%)
                    </span>
                  </div>
                  <Progress value={course.percentage} className="h-2" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {course.totalDuration}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {course.level}
                  </Badge>
                  {course.percentage === 100 && (
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                      Completado
                    </Badge>
                  )}
                  {course.percentage > 0 && course.percentage < 100 && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                      En progreso
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group-hover:border-primary/50"
                >
                  {course.percentage > 0 ? 'Continuar' : 'Comenzar'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseListPage;
