import * as React from "react"
import { Command } from "lucide-react"
import { 
  SiGooglecalendar, 
  SiGmail, 
  SiGithub, 
  SiSlack, 
  SiLinear, 
  SiJira 
} from "react-icons/si"

import { NavUser } from "@/components/nav-user"
import { GoogleCalendarIntegration } from "@/components/GoogleCalendarIntegration"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

interface User {
  id: string
  githubId: string
  username: string
  displayName: string
  email: string
  avatarUrl: string
  profileUrl: string
}

// Integration services data
const data = {
  navMain: [
    {
      title: "Google Calendar",
      url: "#",
      icon: SiGooglecalendar,
      isActive: true,
    },
    {
      title: "Gmail",
      url: "#",
      icon: SiGmail,
      isActive: false,
    },
    {
      title: "GitHub",
      url: "#",
      icon: SiGithub,
      isActive: false,
    },
    {
      title: "Slack",
      url: "#",
      icon: SiSlack,
      isActive: false,
    },
    {
      title: "Linear",
      url: "#",
      icon: SiLinear,
      isActive: false,
    },
    {
      title: "Jira",
      url: "#",
      icon: SiJira,
      isActive: false,
    },
  ],
  mails: [
    {
      name: "Team Meeting",
      email: "calendar@google.com",
      subject: "Sprint Planning Session",
      date: "09:34 AM",
      teaser:
        "Sprint planning meeting scheduled for tomorrow at 10 AM.\nPlease review the backlog items beforehand.",
    },
    {
      name: "GitHub Notification",
      email: "notifications@github.com",
      subject: "PR Review Required",
      date: "Yesterday",
      teaser:
        "Your pull request #123 needs review from team members.\nPlease address the feedback when ready.",
    },
    {
      name: "Slack Update",
      email: "slack@company.com",
      subject: "New Channel Created",
      date: "2 days ago",
      teaser:
        "The #project-alpha channel has been created for the new initiative.\nJoin the conversation to stay updated.",
    },
    {
      name: "Linear Task",
      email: "updates@linear.app",
      subject: "Task Assigned",
      date: "2 days ago",
      teaser:
        "A new high-priority task has been assigned to you.\nDeadline is set for end of this week.",
    },
    {
      name: "Jira Update",
      email: "notifications@atlassian.com",
      subject: "Bug Report Filed",
      date: "1 week ago",
      teaser:
        "A critical bug has been reported in the user authentication flow.\nPriority has been set to high for immediate attention.",
    },
    {
      name: "Calendar Reminder",
      email: "calendar@google.com",
      subject: "Daily Standup",
      date: "1 week ago",
      teaser:
        "Daily standup meeting in 15 minutes.\nPlease prepare your updates for the team.",
    },
  ],
}

export function AppSidebar({ 
  user, 
  ...props 
}: React.ComponentProps<typeof Sidebar> & { user: User }) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const [mails, setMails] = React.useState(data.mails)
  const [googleAccount, setGoogleAccount] = React.useState<{ email: string; connected: boolean } | null>(null)
  const [googleDisconnect, setGoogleDisconnect] = React.useState<(() => Promise<void>) | null>(null)
  const { setOpen } = useSidebar()

  const navUserData = {
    name: user.displayName,
    email: user.email,
    avatar: user.avatarUrl
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const handleGoogleDisconnect = React.useCallback(async () => {
    if (googleDisconnect) {
      await googleDisconnect()
      setGoogleAccount(null)
      setGoogleDisconnect(null)
    }
  }, [googleDisconnect])

  // Memoize callback functions to prevent infinite re-renders
  const handleAccountChange = React.useCallback((account: { email: string; connected: boolean } | null) => {
    setGoogleAccount(account)
  }, [])

  const handleDisconnectRequest = React.useCallback((disconnectFn: () => Promise<void>) => {
    setGoogleDisconnect(() => disconnectFn)
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">TaskFlow</span>
                    <span className="truncate text-xs">Productivity Suite</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item)
                        const mail = data.mails.sort(() => Math.random() - 0.5)
                        setMails(
                          mail.slice(
                            0,
                            Math.max(5, Math.floor(Math.random() * 10) + 1)
                          )
                        )
                        setOpen(true)
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={navUserData} />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            {activeItem?.title === "Google Calendar" && googleAccount ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={`https://unavatar.io/${googleAccount.email}`} 
                        alt={googleAccount.email}
                      />
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {getInitials(googleAccount.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">{googleAccount.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600"
                    onClick={handleGoogleDisconnect}
                  >
                    Disconnect account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Label className="flex items-center gap-2 text-sm">
                <span>Connected</span>
                <Switch className="shadow-none" />
              </Label>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {activeItem?.title === "Google Calendar" ? (
                <GoogleCalendarIntegration 
                  onAccountChange={handleAccountChange}
                  onDisconnectRequest={handleDisconnectRequest}
                />
              ) : (
                <>
                  {mails.map((mail) => (
                    <a
                      href="#"
                      key={mail.email}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                    >
                      <div className="flex w-full items-center gap-2">
                        <span>{mail.name}</span>{" "}
                        <span className="ml-auto text-xs">{mail.date}</span>
                      </div>
                      <span className="font-medium">{mail.subject}</span>
                      <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                        {mail.teaser}
                      </span>
                    </a>
                  ))}
                </>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
