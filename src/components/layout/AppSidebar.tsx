import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom' // Import useNavigate
import {
  Home,
  CheckSquare,
  CreditCard,
  BarChart3,
  Upload,
  TrendingUp,
  FileText,
  MessageSquare,
  FolderOpen,
  Calculator,
  FileSpreadsheet,
  Users,
  Settings,
  User,
  LogOut // Import LogOut icon
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MoneyCollectFilled } from '@ant-design/icons'
import { useToast } from '@/components/ui/use-toast' // Import useToast
import { useAuth } from '@/LoginPage' // Import useAuth from LoginPage.tsx

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Transactions', url: '/transactions', icon: CreditCard },
  { title: 'Financials', url: '/financials', icon: BarChart3 },
  { title: 'Import', url: '/import', icon: Upload },
  { title: 'Data Analytics', url: '/analytics', icon: TrendingUp }
]

const businessItems = [
  { title: 'Invoice/Quote', url: '/invoice-quote', icon: FileText },
  { title: 'Payroll', url: '/payroll', icon: Calculator }, // Changed icon to Calculator from MoneyCollectFilled for lucide-react consistency
  { title: 'POS', url: '/pos', icon: CreditCard },
  { title: 'Projections', url: '/projections', icon: TrendingUp }, // Reusing TrendingUp, consider a different icon if available
  { title: 'Accounting Setup', url: '/accounting', icon: Calculator }, // Reusing Calculator
  { title: 'Document Management', url: '/documents', icon: FolderOpen }, // Changed icon to FolderOpen from FileSpreadsheet
  { title: 'Qx Chat', url: '/quant-chat', icon: MessageSquare }
]

const setupItems = [
  { title: 'Personel Setup', url: '/personel-setup', icon: Users },
  { title: 'Profile Setup', url: '/profile-setup', icon: Settings } // Changed icon to Settings from User
]

export function AppSidebar () {
  const { state } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate() // Initialize useNavigate
  const { toast } = useToast() // Initialize useToast
  const { logout } = useAuth() // Get the logout function from the authentication context

  const currentPath = location.pathname

  // Modified getNavCls to apply more distinct styling for the active tab
  const getNavCls = (active: boolean) =>
    `flex items-center w-full px-3 py-2 rounded-md transition-colors duration-200
     ${active
       ? 'bg-blue-600 text-white font-bold shadow-sm' // Stronger active state with blue background
       : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-50' // Default and hover states
     }`

  const handleLogout = () => {
    logout(); // Clear authentication state
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
      variant: 'default',
    });
    navigate('/login'); // Redirect to the login page
  };

  return (
    <Sidebar className='border-r bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50'>
      <SidebarHeader className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <motion.div
          className='flex items-center space-x-2'
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold text-sm'>Q</span>
          </div>
          {state === 'expanded' && (
            <div>
              <h1 className='font-bold text-lg'>Quantilytix</h1>
              <p className='text-xs text-muted-foreground'>
                unlocking endless possibilities
              </p>
            </div>
          )}
        </motion.div>
      </SidebarHeader>

      <SidebarContent className='flex-1 overflow-y-auto'>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }} // Adjusted delay for smoother animation
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => getNavCls(isActive)}
                      >
                        <item.icon className='h-5 w-5' /> {/* Increased icon size slightly */}
                        {state === 'expanded' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Business Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (index + navigationItems.length) * 0.05 }} // Adjusted delay
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => getNavCls(isActive)}
                      >
                        {/* Render Ant Design icon if it's MoneyCollectFilled, otherwise Lucide icon */}
                        {item.icon === MoneyCollectFilled ? (
                            <MoneyCollectFilled style={{ fontSize: '20px' }} />
                        ) : (
                            <item.icon className='h-5 w-5' />
                        )}
                        {state === 'expanded' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Setup</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: (index + navigationItems.length + businessItems.length) * 0.05 }} // Adjusted delay
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => getNavCls(isActive)}
                      >
                        <item.icon className='h-5 w-5' />
                        {state === 'expanded' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='p-4 border-t border-gray-200 dark:border-gray-700'>
        {/* User Info */}
        <div className='flex items-center space-x-2 text-sm text-muted-foreground mb-4'>
          <User className='h-5 w-5' />
          {state === 'expanded' && <span>Chris</span>}
        </div>

        {/* Logout Button */}
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleLogout} className='w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'>
            <LogOut className='h-5 w-5' />
            {state === 'expanded' && <span>Logout</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}
