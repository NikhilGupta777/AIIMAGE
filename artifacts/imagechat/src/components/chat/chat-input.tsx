import React, { useRef, useEffect } from 'react';
import {
  Send, Sparkles, Loader2, Paperclip, X, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessageAspectRatio } from '@workspace/api-client-react';

export interface PendingAttachment {
  name: string;
  mimeType: string;
  data: string;
  previewUrl: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, attachments: PendingAttachment[]) => void;
  onGenerateImage: (prompt: string, aspectRatio: ChatMessageAspectRatio, referenceImage?: PendingAttachment) => void;
  isPending: boolean;
}

export function ChatInput({ onSendMessage, onGenerateImage, isPending }: ChatInputProps) {
  const [input, setInput] = React.useState('');
  const [mode, setMode] = React.useState<'chat' | 'image'>('chat');
  const [aspectRatio, setAspectRatio] = React.useState<ChatMessageAspectRatio>('16:9');
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [toolsOpen, setToolsOpen] = React.useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const h = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(h, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAttachments: PendingAttachment[] = [];
    for (const file of files) {
      const data = await fileToBase64(file);
      const previewUrl = file.type.startsWith('image/') ? `data:${file.type};base64,${data}` : '';
      newAttachments.push({ name: file.name, mimeType: file.type, data, previewUrl });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!input.trim() || isPending) return;
    if (mode === 'image') {
      const refImage = attachments.find(a => a.mimeType.startsWith('image/'));
      onGenerateImage(input.trim(), aspectRatio, refImage);
    } else {
      onSendMessage(input.trim(), attachments);
    }
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const switchToImage = () => {
    setMode('image');
    setToolsOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const switchToChat = () => {
    setMode('chat');
    setToolsOpen(false);
  };

  return (
    <div className="relative w-full mx-auto max-w-3xl">
      <div className={cn(
        'relative flex flex-col rounded-2xl border bg-card/90 backdrop-blur-xl shadow-lg transition-all',
        mode === 'image'
          ? 'border-purple-500/30 shadow-purple-500/5'
          : 'border-border/60 focus-within:border-border shadow-black/10'
      )}>

        {/* Image mode header bar */}
        <AnimatePresence>
          {mode === 'image' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-purple-500/8 border-b border-purple-500/15">
                <div className="flex items-center gap-2 text-xs font-medium text-purple-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {attachments.some(a => a.mimeType.startsWith('image/'))
                      ? 'Image Editing · Gemini 3.1 Flash'
                      : 'Image Generation · Gemini 3.1 Flash'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-background/50 rounded-lg p-0.5 border border-border/50 text-xs">
                    {(['16:9', '9:16'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className={cn(
                          'px-2.5 py-1 rounded-md font-medium transition-all',
                          aspectRatio === r
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        )}
                      >
                        {r === '16:9' ? '⬛ 16:9' : '▮ 9:16'}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchToChat}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment previews */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex flex-wrap gap-2 px-4 pt-3 pb-0">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group/att">
                    {att.previewUrl ? (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                        <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-secondary px-3 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground max-w-[160px]">
                        <Paperclip className="w-3 h-3 shrink-0" />
                        <span className="truncate">{att.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input row */}
        <div className="flex items-end px-3 py-2.5 gap-1.5">
          {/* Attach button */}
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple={mode === 'chat'}
              accept={mode === 'image' ? 'image/*' : 'image/*,application/pdf,.txt,.csv,.json,.md'}
              onChange={handleFileSelect}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 mb-0.5"
                  disabled={isPending}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{mode === 'image' ? 'Attach reference image to edit' : 'Attach file or image'}</TooltipContent>
            </Tooltip>
          </>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'image'
                ? attachments.some(a => a.mimeType.startsWith('image/'))
                  ? 'Describe how to edit this image...'
                  : 'Describe the image you want to generate...'
                : 'Ask Gemini anything...'
            }
            className="flex-1 min-h-[40px] max-h-[160px] resize-none bg-transparent border-0 focus-visible:ring-0 px-1 py-2 shadow-none text-sm leading-relaxed"
            rows={1}
            disabled={isPending}
          />

          {/* Tools dropdown (chat mode only) */}
          {mode === 'chat' && (
            <div className="relative mb-0.5" ref={toolsRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setToolsOpen(!toolsOpen)}
                    className={cn(
                      'h-9 px-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 gap-1',
                      toolsOpen && 'bg-secondary/60 text-foreground'
                    )}
                    disabled={isPending}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium hidden sm:inline">Tools</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform', toolsOpen && 'rotate-180')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tools</TooltipContent>
              </Tooltip>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full right-0 mb-2 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-1">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 py-1.5">Tools</div>
                      <button
                        onClick={switchToImage}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">Create image</div>
                          <div className="text-[10px] text-muted-foreground">Gemini 3.1 Flash</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Send button */}
          <Button
            size="icon"
            disabled={!input.trim() || isPending}
            onClick={handleSubmit}
            className={cn(
              'h-9 w-9 shrink-0 rounded-xl mb-0.5 transition-all',
              input.trim() && !isPending
                ? mode === 'image'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:scale-105'
                  : 'bg-foreground hover:bg-foreground/90 text-background shadow-md hover:scale-105'
                : 'bg-secondary/60 text-muted-foreground cursor-not-allowed'
            )}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : mode === 'image'
                ? <Sparkles className="w-4 h-4" />
                : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
        Gemini can make mistakes. Verify important information.
      </p>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
