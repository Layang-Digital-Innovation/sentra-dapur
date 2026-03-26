import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
// import { ChatNotificationProvider } from "@/contexts/ChatNotificationContext"; // chat disembunyikan sementara
import { ProjectNotificationProvider } from "@/contexts/ProjectNotificationContext";
// import { SocketProvider } from "@/contexts/SocketContext"; // chat dinonaktifkan sementara untuk menghindari websocket error
import LayoutContent from "@/components/layout/LayoutContent";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/utils/axiosConfig';

export const metadata: Metadata = {
  title: "Sentra Dapur",
  description: "Platform Sentra Dapur",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {/* <SocketProvider> */}
            <ProjectNotificationProvider>
              <LayoutContent>
                {children}
              </LayoutContent>
              <ToastContainer />
            </ProjectNotificationProvider>
          {/* </SocketProvider> */}
        </AuthProvider>
      </body>
    </html>
  );
}
