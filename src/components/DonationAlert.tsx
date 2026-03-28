import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DonationEvent } from '../hooks/useWebSocket';
import { cn } from '../lib/utils';

interface DonationAlertProps {
  latestDonation: DonationEvent | null;
}

export function DonationAlert({ latestDonation }: DonationAlertProps) {
  const [currentDonation, setCurrentDonation] = useState<DonationEvent | null>(null);

  useEffect(() => {
    if (latestDonation) {
      setCurrentDonation(latestDonation);
      
      const timer = setTimeout(() => {
        setCurrentDonation(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [latestDonation]);

  // Use createPortal to absolutely guarantee it renders at the root viewport layer 
  // bypassing all relative stacking contexts naturally.
  return createPortal(
    <AnimatePresence>
      {currentDonation && (
        <motion.div
          initial={{ y: -200, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -200, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex flex-col items-center justify-center w-full"
        >
          <div className="bg-surface-container-highest/95 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_30px_60px_-15px_rgba(255,100,100,0.3)] border-4 border-error/50 flex flex-col items-center max-w-[400px] w-full text-center">
            
            <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 mb-6 border-4 border-error/30 shadow-inner">
              <img 
                src={currentDonation.imageUrl} 
                alt="Donation Meme" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex flex-col text-on-surface items-center w-full">
              <div className="text-3xl font-black uppercase tracking-widest text-error-light drop-shadow-md mb-2">
                NEW DONATION!
              </div>
              
              <div className="text-xl font-bold mt-1 text-on-surface leading-tight">
                <span>{currentDonation.username}</span> 
                <br/>
                gifted <span className="text-primary-light font-black text-2xl">{currentDonation.amount} Bits!</span>
              </div>
              
              <div className="mt-5 text-lg font-medium italic text-on-surface-variant bg-surface-container-lowest/70 px-6 py-4 rounded-2xl inline-block w-full border border-outline-variant/10">
                "{currentDonation.message}"
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
