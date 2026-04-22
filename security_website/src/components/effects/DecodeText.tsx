import React, { useState, useEffect, useRef } from 'react';

interface DecodeTextProps {
  text: string;
  delay?: number;
  className?: string;
}

const DecodeText: React.FC<DecodeTextProps> = ({ text, delay = 0, className = '' }) => {
  const [displayText, setDisplayText] = useState('');
  const chars = '!@#$%^&*()_+{}:"<>?|[];\',./`~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const iterations = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startDecoding = () => {
      const interval = setInterval(() => {
        setDisplayText((prev) => {
          return text
            .split('')
            .map((char, index) => {
              if (index < iterations.current) {
                return text[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');
        });

        if (iterations.current >= text.length) {
          clearInterval(interval);
        }

        iterations.current += 1 / 3;
      }, 30);

      return () => clearInterval(interval);
    };

    const timer = setTimeout(startDecoding, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return <span className={className}>{displayText || text.split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('')}</span>;
};

export default DecodeText;
