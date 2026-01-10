'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ContactModal } from './ContactModal'

export function ChatWidget() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Card 
        className="p-4 bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30 flex items-center justify-between cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-200 flex items-center justify-center">
            <span className="material-symbols-outlined">chat</span>
          </div>
          <div>
            <p className="font-bold text-sm">Hai domande?</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Chatta con il nostro staff</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
      </Card>

      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  )
}

