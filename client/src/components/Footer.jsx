export default function Footer({ visits }) {
  return (
        <footer className="footer">
          <span className="footer-text">© {new Date().getFullYear()} VoxTube. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {visits !== null && (
              <span className="footer-link" style={{ cursor: 'default', color: 'var(--text-3)' }}>
                {visits.toLocaleString()} visits
              </span>
            )}
            <a href="https://github.com/amanrock1/voxtube" target="_blank" rel="noreferrer" className="footer-link">
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/aman-prabhat-b75735325/" target="_blank" rel="noreferrer" className="footer-link">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn
            </a>
          </div>
        </footer>
  );
}
