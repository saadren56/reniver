'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, CheckCheck, Zap, Shield, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppStore } from '@/store';

const features = [
  {
    icon: <MessageSquare className="h-8 w-8" />,
    title: 'Real-time Chat',
    description: 'Send and receive messages instantly with real-time synchronization across all your devices.'
  },
  {
    icon: <CheckCheck className="h-8 w-8" />,
    title: 'Read Receipts',
    description: 'Know when your messages have been delivered and read with visual indicators.'
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: 'Lightning Fast',
    description: 'Built with modern technologies for blazing fast performance and smooth user experience.'
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Secure & Private',
    description: 'Your conversations are protected with end-to-end encryption and strict privacy policies.'
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: 'Team Collaboration',
    description: 'Create groups and collaborate with your team in dedicated chat rooms.'
  },
  {
    icon: <Send className="h-8 w-8" />,
    title: 'Media Sharing',
    description: 'Share images, documents, and other files easily with your contacts.'
  }
];

export default function Home() {
  const theme = useAppStore((state) => state.theme);

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 mb-6">
              <span className="text-sm font-medium">✨ New Version 2.0</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Chat with Anyone,
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {' '}Anywhere
              </span>
            </h1>
            <p className={`text-xl mb-10 max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Experience the future of communication with our beautiful, fast, and secure chat application.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="secondary" className="text-lg px-8 py-6">
                  Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className={`py-20 px-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need
              </h2>
              <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Packed with features to make your communication experience amazing
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className={`border ${theme === 'dark' ? 'bg-gray-950 border-gray-800 hover:border-purple-500/50' : 'bg-white hover:border-purple-200'} transition-all hover:shadow-lg`}>
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className={`text-lg mb-10 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Join thousands of users already using ChatApp
            </p>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

