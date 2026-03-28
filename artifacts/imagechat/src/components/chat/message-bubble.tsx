import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Sparkles, User, Copy, Check } from 'lucide-react';
import { formatTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ChatMessage } from '@workspace/api-client-react';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleDownload = () => {
    if (!message.imageUrl) return;
    const a = document.createElement('a');
    a.href = message.imageUrl;
    let ext = 'jpg';
    if (message.imageUrl.startsWith('data:image/')) {
      const match = message.imageUrl.match(/^data:image\/([^;]+);/);
      if (match) ext = match[1];
    }
    a.download = `gemini-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex w-full group', isUser ? 'justify-end' : 'justify-start', 'mb-5')}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-0.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}

      <div className={cn('flex flex-col relative', isUser ? 'items-end max-w-[82%]' : 'items-start max-w-[85%] md:max-w-[78%]')}>
        {/* Attached images (user uploads) */}
        {isUser && message.attachmentUrls && message.attachmentUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.attachmentUrls.map((url, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-border/50 shadow-sm">
                <img
                  src={url}
                  alt={`Attachment ${i + 1}`}
                  className="max-w-[240px] max-h-[200px] object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Text message */}
        {message.type === 'text' && message.content && (
          <div className={cn(
            'relative rounded-2xl overflow-hidden',
            isUser
              ? 'bg-[hsl(var(--secondary))] text-secondary-foreground px-4 py-2.5 rounded-tr-sm'
              : 'text-foreground pr-2'
          )}>
            <div className={cn(
              'prose max-w-none break-words text-sm leading-relaxed',
              isUser ? 'prose-invert' : 'prose-invert prose-p:my-2 prose-pre:bg-card prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:text-foreground prose-strong:text-foreground'
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {!isUser && (
              <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg text-muted-foreground/60 hover:text-foreground"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copied!' : 'Copy'}</TooltipContent>
                </Tooltip>
                {message.timestamp && (
                  <span className="text-[10px] text-muted-foreground/40 ml-1">
                    {formatTime(message.timestamp)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generated image message */}
        {message.type === 'image' && message.imageUrl && (
          <div className="flex flex-col w-full">
            <div className="relative group/image overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md">
              <img
                src={message.imageUrl}
                alt={message.content}
                className={cn(
                  'w-full h-auto object-cover block transition-transform duration-700 group-hover/image:scale-[1.01]',
                  message.aspectRatio === '16:9' ? 'aspect-video' :
                    message.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[560px] mx-auto' : ''
                )}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/30 transition-all duration-200 flex items-end justify-end p-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="opacity-0 group-hover/image:opacity-100 transition-opacity rounded-xl h-9 w-9 shadow-xl bg-background/90 hover:bg-background"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="mt-2 px-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">{message.content}</span>
              <span className="shrink-0 text-border">·</span>
              <span className="shrink-0">{message.aspectRatio}</span>
            </div>
          </div>
        )}

        {/* User timestamp */}
        {isUser && message.timestamp && (
          <div className="text-[10px] text-muted-foreground/40 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-3 mt-0.5">
          <div className="w-7 h-7 rounded-full bg-secondary border border-border/50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-secondary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
