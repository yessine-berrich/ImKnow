import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";

export const metadata: Metadata = {
  title: 'ImKnow',
  description: 'Plateforme de gestion de connaissances',
  icons: {
    icon: '/images/logo/logo-1.png',
    shortcut: '/images/logo/logo-1.png',
    apple: '/images/logo/logo-1.png',
  },
};
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import AIAssistant from '@/components/ia-assistant/AIAssistant';
import GoogleAuthProvider from '@/components/auth/GoogleAuthProvider';
import { ChatProvider } from '@/context/ChatContext';
import ToastContainer from '@/components/modals/ToastContainer';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { UserProvider } from '@/context/UserContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        
          <LanguageProvider>
            <UserProvider>
              <SidebarProvider>
                <GoogleAuthProvider>
                  <ChatProvider>
                    {children}
                    <ToastContainer />
                    <ConfirmModal />
                  </ChatProvider>
                </GoogleAuthProvider>
              </SidebarProvider>
            </UserProvider>
          </LanguageProvider>
       
      </body>
    </html>
  );
}