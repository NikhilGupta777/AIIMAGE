import React from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/hooks/use-chat-store';
import { formatTime, cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { conversations, currentConversationId, setCurrentConversation, getOrCreateEmptyConversation, deleteConversation } = useChatStore();

  const handleNewChat = () => {
    getOrCreateEmptyConversation();
    if (window.innerWidth < 768) onToggle();
  };

  const handleSelectChat = (id: string) => {
    setCurrentConversation(id);
    if (window.innerWidth < 768) onToggle();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onToggle}
        />
      )}

      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isOpen ? "w-[268px] translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none"
      )}>
        <div className="p-3 flex items-center gap-2 border-b border-sidebar-border/50">
          <Button
            onClick={handleNewChat}
            className="flex-1 justify-start rounded-xl bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 border border-sidebar-border/60 h-10 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2 shrink-0" />
            <span className="font-medium text-sm">New Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="md:hidden shrink-0 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent h-10 w-10"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-xs text-muted-foreground px-3 py-8 text-center">
              No conversations yet
            </div>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pb-2">
                Recent
              </div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                    currentConversationId === conv.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                  )}
                  onClick={() => handleSelectChat(conv.id)}
                >
                  {conv.title.startsWith('🎨') ? (
                    <ImageIcon className="w-3.5 h-3.5 mr-2.5 shrink-0 opacity-60" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5 mr-2.5 shrink-0 opacity-60" />
                  )}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="truncate text-[13px] font-medium leading-tight">
                      {conv.title.replace('🎨 ', '')}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatTime(conv.updatedAt)}
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 w-7 h-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Delete</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {!isOpen && (
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggle}
          className="fixed top-4 left-4 z-40 hidden md:flex rounded-xl shadow-md border border-border bg-card/80 backdrop-blur-md hover:bg-accent h-10 w-10"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </Button>
      )}
    </>
  );
}
