"use client"

import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

type PageTransitionProps = {
  transitionKey: string
  children: React.ReactNode
  className?: string
}

export function PageTransition({ transitionKey, children, className }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        className={cn("h-full", className)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
