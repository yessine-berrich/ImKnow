import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
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