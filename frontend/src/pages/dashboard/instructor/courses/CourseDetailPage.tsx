import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { getCourseBySlug } from '@/features/academy/data';
import { useCourseProgress } from '@/features/academy/model/useCourseProgress';
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Activity,
  Award,
  Clock,
  CheckCircle2,
  Play,
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

const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const course = getCourseBySlug(slug || '');
  const { getProgress } = useCourseProgress();


  if (!course) {
    return (
      <div className="bg-background px-4 pt-4 pb-6">
        <div className="w-full max-w-4xl mx-auto text-center py-16">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Curso no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            El curso que buscas no existe o no está disponible.
          </p>
          <Button onClick={() => navigate('/instructor/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a cursos
          </Button>
        </div>
      </div>
    );
  }

  const progress = getProgress(course.id);
  const completed = progress.completedLessons.length;
  const percentage =
    course.totalLessons > 0
      ? Math.round((completed / course.totalLessons) * 100)
      : 0;
  const IconComponent = iconMap[course.icon] || BookOpen;

  return (
    <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/instructor/courses')}
          className="-ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a cursos
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className={`p-3 rounded-xl border ${
              colorMap[course.color] || colorMap.indigo
            }`}
          >
            <IconComponent className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {course.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {course.totalDuration}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {course.totalLessons} lecciones
              </Badge>
              <Badge variant="outline" className="text-xs">
                {course.level}
              </Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between">
              <span>Progreso del curso</span>
              <span className="font-bold">
                {completed}/{course.totalLessons} ({percentage}%)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={percentage} className="h-3" />
          </CardContent>
        </Card>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Lecciones</h2>
          <div className="space-y-2">
            {course.lessons.map((lesson, index) => {
              const isCompleted = progress.completedLessons.includes(
                lesson.id
              );
              return (
                <Card
                  key={lesson.id}
                  className={`hover:shadow-sm transition-all cursor-pointer ${
                    isCompleted ? 'border-emerald-200 bg-emerald-50/30' : ''
                  }`}
                  onClick={() =>
                    navigate(
                      `/instructor/courses/${course.slug}/lessons/${lesson.id}`
                    )
                  }
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium text-sm ${
                          isCompleted
                            ? 'text-emerald-800'
                            : 'text-foreground'
                        }`}
                      >
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {lesson.duration}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
