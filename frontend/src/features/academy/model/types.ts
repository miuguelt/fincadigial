export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  content: string;
  objectives: string[];
  keyPoints: string[];
  quiz?: CourseQuiz;
}

export interface CourseQuiz {
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  totalLessons: number;
  totalDuration: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  lessons: CourseLesson[];
}

export interface CourseProgress {
  courseId: string;
  completedLessons: string[];
  quizScores: Record<string, number>;
  lastAccessed: string;
  startedAt: string;
}
