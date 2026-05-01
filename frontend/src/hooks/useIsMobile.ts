import { useState, useEffect } from 'react';

/**
 * 画面幅がスマホサイズ（768px未満など）かどうかを判定するカスタムフック
 * @param breakpoint ブレークポイント（デフォルト: 768px）
 * @returns スマホサイズなら true, それ以外なら false
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // 初期化時に一度判定
    handleResize();

    // リサイズイベントの監視
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
