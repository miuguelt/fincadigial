import React, { useMemo } from 'react';
import { cn } from '@/shared/ui/cn';
import { parseLessonContent, type LessonBlock } from '../model/lessonMarkdown';
import { renderInline } from './LessonInline';
import { LessonTable } from './LessonTable';

const headingClass: Record<2 | 3 | 4, string> = {
  2: 'mt-8 first:mt-0 border-b border-border/70 pb-2 text-lg sm:text-xl font-bold tracking-tight text-foreground',
  3: 'mt-6 first:mt-0 text-base sm:text-lg font-semibold text-foreground',
  4: 'mt-5 first:mt-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground',
};

const LessonBlockView: React.FC<{ block: LessonBlock }> = ({ block }) => {
  if (block.kind === 'heading') {
    const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
    return <Tag className={headingClass[block.level]}>{renderInline(block.text)}</Tag>;
  }

  if (block.kind === 'paragraph') {
    return (
      <p className="mt-3 text-sm sm:text-[0.95rem] leading-relaxed text-muted-foreground break-words">
        {renderInline(block.text)}
      </p>
    );
  }

  if (block.kind === 'table') {
    return <LessonTable header={block.header} rows={block.rows} />;
  }

  const ListTag = block.ordered ? 'ol' : 'ul';
  return (
    <ListTag
      className={cn(
        'mt-3 space-y-1.5 pl-5 text-sm sm:text-[0.95rem] leading-relaxed text-muted-foreground',
        block.ordered
          ? 'list-decimal marker:font-semibold marker:text-primary'
          : 'list-disc marker:text-primary'
      )}
    >
      {block.items.map((item, index) => (
        <li key={index} className="break-words pl-1">
          {renderInline(item)}
        </li>
      ))}
    </ListTag>
  );
};

interface LessonMarkdownProps {
  content: string;
}

export const LessonMarkdown: React.FC<LessonMarkdownProps> = ({ content }) => {
  const blocks = useMemo(() => parseLessonContent(content), [content]);

  return (
    <div className="max-w-[72ch]">
      {blocks.map((block, index) => (
        <LessonBlockView key={index} block={block} />
      ))}
    </div>
  );
};

export default LessonMarkdown;
