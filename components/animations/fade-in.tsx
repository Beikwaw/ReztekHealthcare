"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type FadeInProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
  inView?: boolean
  once?: boolean
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.28,
  y = 8,
  inView = false,
  once = true,
}: FadeInProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={inView ? { opacity: 1, y: 0 } : undefined}
      animate={!inView ? { opacity: 1, y: 0 } : undefined}
      viewport={inView ? { once, amount: 0.2 } : undefined}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
