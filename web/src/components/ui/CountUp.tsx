"use client";

import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface CountUpProps {
  to?: number;
  value?: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  step?: number;
  onStart?: () => void;
  onEnd?: () => void;
  locale?: string;
  immediate?: boolean;
}

export default function CountUp({
  to,
  value,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  step,
  onStart,
  onEnd,
  locale = 'en-US',
  immediate = false
}: CountUpProps) {
  const target = value ?? to ?? 0;
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? target : from);
  const reducedMotion = useReducedMotion();

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(target));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };

      const steppedLatest = step && step > 0
        ? Math.round(latest / step) * step
        : latest;
      const boundedLatest = direction === 'down'
        ? Math.max(target, steppedLatest)
        : Math.min(target, steppedLatest);
      const formattedNumber = Intl.NumberFormat(locale, options).format(boundedLatest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [direction, locale, maxDecimals, separator, step, target]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? target : from);
    }
  }, [from, target, direction, formatValue]);

  useEffect(() => {
    if (value !== undefined && isInView && startWhen) {
      if (reducedMotion || immediate) {
        springValue.jump(target);
        if (ref.current) {
          ref.current.textContent = formatValue(target);
        }
      } else {
        motionValue.set(target);
      }

      return;
    }

    if (isInView && startWhen) {
      if (typeof onStart === 'function') {
        onStart();
      }

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : target);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [delay, direction, duration, formatValue, from, immediate, isInView, motionValue, onEnd, onStart, reducedMotion, springValue, startWhen, target, value]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}
