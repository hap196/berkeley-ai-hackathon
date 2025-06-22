import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SiSlack } from 'react-icons/si';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SlackIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
  onAccountChange?: (account: { username: string; teamName: string; connected: boolean } | null) => void;
  onDisconnectRequest?: (disconnectFn: () => Promise<void>) => void;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount: number;
  topic: string;
  purpose: string;
}

interface SlackMessage {
  id: string;
  text: string;
  user: string;
  timestamp: string;
  type: string;
}

export function SlackIntegration({ onConnectionChange, onAccountChange, onDisconnectRequest }: SlackIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | null>(null);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/slack/status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setTeamName(data.teamName);
        setUsername(data.username);
        onConnectionChange?.(data.connected);
      }
    } catch (error) {
      console.error('Error checking Slack status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    // Redirect to Slack OAuth
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/slack/connect`;
  };

  const handleDisconnect = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/slack/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsConnected(false);
        setTeamName(null);
        setUsername(null);
        setChannels([]);
        setSelectedChannel(null);
        setMessages([]);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
    }
  }, [onConnectionChange]);

  const fetchChannels = async () => {
    if (!isConnected) return;

    setChannelsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/slack/channels`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      } else if (response.status === 401) {
        setIsConnected(false);
        setTeamName(null);
        setUsername(null);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
    } finally {
      setChannelsLoading(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/slack/messages/${channelId}?limit=20`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else if (response.status === 401) {
        setIsConnected(false);
        setTeamName(null);
        setUsername(null);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error('Error fetching Slack messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleChannelSelect = (channel: SlackChannel) => {
    setSelectedChannel(channel);
    fetchMessages(channel.id);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  useEffect(() => {
    checkConnectionStatus();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'slack') {
      setTimeout(() => {
        checkConnectionStatus();
        window.history.replaceState({}, '', window.location.pathname);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchChannels();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && teamName && username) {
      onAccountChange?.({ username, teamName, connected: true });
    } else {
      onAccountChange?.(null);
    }
  }, [isConnected, teamName, username, onAccountChange]);
  
  useEffect(() => {
    if (onDisconnectRequest) {
      onDisconnectRequest(handleDisconnect);
    }
  }, [handleDisconnect, onDisconnectRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-8">
        <Button 
          onClick={handleConnect} 
          disabled={connecting}
          className="w-full sm:w-auto"
        >
          <SiSlack className="h-4 w-4 mr-2" />
          {connecting ? 'Connecting...' : 'Connect Slack'}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <SiSlack className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm">{teamName}</h3>
            <p className="text-xs text-muted-foreground">@{username}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Channels Sidebar */}
        <div className="w-64 border-r bg-muted/20">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Channels</h4>
          </div>
          <ScrollArea className="h-[calc(100vh-240px)]">
            {channelsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading channels...
              </div>
            ) : (
              <div className="p-2">
                {channels.filter(c => c.isMember).map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors ${
                      selectedChannel?.id === channel.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">#</span>
                      <span className="text-sm font-medium truncate">{channel.name}</span>
                      {channel.isPrivate && (
                        <Badge variant="secondary" className="text-xs ml-auto">Private</Badge>
                      )}
                    </div>
                    {channel.topic && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {channel.topic}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <h4 className="font-medium">{selectedChannel.name}</h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedChannel.memberCount} members
                  </span>
                </div>
                {selectedChannel.topic && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedChannel.topic}
                  </p>
                )}
              </div>
              
              <ScrollArea className="flex-1 p-3">
                {messagesLoading ? (
                  <div className="text-center text-sm text-muted-foreground">
                    Loading messages...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={`https://unavatar.io/${message.user}`} />
                          <AvatarFallback className="text-xs">
                            {message.user.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{message.user}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1 break-words">
                            {message.text || '(No text content)'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <SiSlack className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a channel to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 