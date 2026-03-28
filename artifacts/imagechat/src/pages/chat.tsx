import React, { useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInput, type PendingAttachment } from '@/components/chat/chat-input';
import { MessageBubble } from '@/components/chat/message-bubble';
import { useChatStore } from '@/hooks/use-chat-store';
import { useSendMessage, useGenerateImage, type ChatMessageAspectRatio, type ChatMessage } from '@workspace/api-client-react';
import { Sparkles, PanelLeftOpen, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { conversations, currentConversationId, getOrCreateEmptyConversation, addMessage, setCurrentConversation } = useChatStore();
  const { toast } = useToast();

  const sendMessageMutation = useSendMessage();
  const generateImageMutation = useGenerateImage();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversations.length === 0 && !currentConversationId) {
      getOrCreateEmptyConversation();
    } else if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversation(conversations[0].id);
    }
  }, []);

  const currentConv = conversations.find(c => c.id === currentConversationId);
  const messages = currentConv?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, sendMessageMutation.isPending, generateImageMutation.isPending]);

  const handleSendMessage = async (text: string, attachments: PendingAttachment[]) => {
    let convId = currentConversationId;
    if (!convId) convId = getOrCreateEmptyConversation();

    const attachmentUrls = attachments.filter(a => a.previewUrl).map(a => a.previewUrl);

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      type: 'text',
      timestamp: new Date().toISOString(),
      attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    };
    addMessage(convId, userMessage);

    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
      type: m.type,
      imageUrl: m.imageUrl,
      aspectRatio: m.aspectRatio,
      attachmentUrls: m.attachmentUrls,
    }));

    try {
      const response = await sendMessageMutation.mutateAsync({
        data: {
          message: text,
          history,
          attachments: attachments.length > 0
            ? attachments.map(a => ({ data: a.data, mimeType: a.mimeType, name: a.name }))
            : undefined,
        },
      });

      addMessage(convId, {
        role: 'assistant',
        content: response.message,
        type: 'text',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateImage = async (prompt: string, aspectRatio: ChatMessageAspectRatio, referenceImage?: PendingAttachment) => {
    let convId = currentConversationId;
    if (!convId) convId = getOrCreateEmptyConversation();

    addMessage(convId, {
      role: 'user',
      content: prompt,
      type: 'image',
      aspectRatio,
      timestamp: new Date().toISOString(),
      attachmentUrls: referenceImage?.previewUrl ? [referenceImage.previewUrl] : undefined,
    });

    try {
      const response = await generateImageMutation.mutateAsync({
        data: {
          prompt,
          aspectRatio,
          referenceImage: referenceImage
            ? { data: referenceImage.data, mimeType: referenceImage.mimeType }
            : undefined,
        },
      });

      addMessage(convId, {
        role: 'assistant',
        content: prompt,
        type: 'image',
        imageUrl: `data:${response.mimeType};base64,${response.imageData}`,
        aspectRatio: response.aspectRatio as ChatMessageAspectRatio,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      toast({
        title: 'Failed to generate image',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const isPending = sendMessageMutation.isPending || generateImageMutation.isPending;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile header */}
        <header className="md:hidden flex items-center px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="-ml-1 mr-2 rounded-xl h-9 w-9">
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm text-foreground truncate">
            {currentConv?.title?.replace('🎨 ', '') || 'Gemini Studio'}
          </span>
        </header>

        {/* Chat thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-40">
          <div className="max-w-3xl mx-auto flex flex-col">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
                <img
                  src={`${import.meta.env.BASE_URL}images/ai-avatar.png`}
                  alt="Gemini Studio"
                  className="w-20 h-20 mb-5 rounded-2xl object-cover shadow-lg shadow-purple-500/20"
                />
                <h1 className="text-3xl font-bold tracking-tight mb-2">Where should we start?</h1>
                <p className="text-muted-foreground max-w-sm mb-10 text-sm">
                  Chat with Gemini 2.5 Flash or generate images with Gemini 3.1 Flash Image. Attach files, images, and more.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                  <button
                    onClick={() => handleSendMessage('What can you help me with today?', [])}
                    className="p-4 rounded-2xl border border-border bg-card/60 hover:bg-card transition-all text-left shadow-sm group"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-400 mb-2" />
                    <span className="font-medium text-sm block mb-0.5 text-foreground">Start a conversation</span>
                    <span className="text-muted-foreground text-xs">Ask me anything...</span>
                  </button>
                  <button
                    onClick={() => handleGenerateImage('A breathtaking landscape at golden hour, photorealistic', '16:9')}
                    className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-left shadow-sm group"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-400 mb-2" />
                    <span className="font-medium text-sm block mb-0.5 text-foreground">Generate an image</span>
                    <span className="text-muted-foreground text-xs">Create with Gemini 3.1 Flash...</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('Explain quantum computing in simple terms with analogies', [])}
                    className="p-4 rounded-2xl border border-border bg-card/60 hover:bg-card transition-all text-left shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 mb-2" />
                    <span className="font-medium text-sm block mb-0.5 text-foreground">Explain a concept</span>
                    <span className="text-muted-foreground text-xs">Quantum computing, AI, science...</span>
                  </button>
                  <button
                    onClick={() => handleGenerateImage('A futuristic cyberpunk city at night, neon lights, rain, cinematic', '9:16')}
                    className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-left shadow-sm"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-400 mb-2" />
                    <span className="font-medium text-sm block mb-0.5 text-foreground">Cyberpunk portrait</span>
                    <span className="text-muted-foreground text-xs">Generate 9:16 portrait...</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}

                {isPending && (
                  <div className="flex w-full justify-start mb-5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mr-3 mt-0.5 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-1 pt-2">
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background via-background/96 to-transparent pt-12 pb-5 px-4 sm:px-6">
          <ChatInput
            onSendMessage={handleSendMessage}
            onGenerateImage={handleGenerateImage}
            isPending={isPending}
          />
        </div>
      </main>
    </div>
  );
}
