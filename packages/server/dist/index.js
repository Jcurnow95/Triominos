import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';
import { sweepEmptyRooms } from './rooms.js';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
/**
 * `import.meta.url` only resolves to a real path in actual ESM (dev/`node dist/index.js`).
 * Once this file is bundled into the single-executable's CJS blob it comes back empty
 * (there's no real file on disk for it to point at), and fileURLToPath throws on that --
 * harmlessly, since the packaged .exe never needs this fallback anyway (see below).
 */
function devDirname() {
    try {
        return path.dirname(fileURLToPath(import.meta.url));
    }
    catch {
        return null;
    }
}
/**
 * Locates the built client. In dev/`node dist/index.js` this is the sibling client
 * package's dist/; in the packaged .exe there's no such workspace layout on disk, so we
 * instead look for a `client/` folder shipped next to the executable itself.
 */
function findClientDist() {
    const nextToExe = path.join(path.dirname(process.execPath), 'client');
    if (existsSync(path.join(nextToExe, 'index.html')))
        return nextToExe;
    const here = devDirname();
    if (here)
        return path.join(here, '../../client/dist');
    throw new Error('Could not locate the built client: no dist/ next to the server and no client/ folder next to the executable.');
}
const CLIENT_DIST = findClientDist();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: process.env.NODE_ENV === 'production' ? undefined : { origin: '*' },
});
app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
        if (err)
            res.status(200).send('Tri-Ominos server is running. Start the client dev server separately in dev mode.');
    });
});
io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
});
setInterval(sweepEmptyRooms, 5 * 60 * 1000);
/** Only relevant for the double-click .exe -- a `node dist/index.js` dev run stays a plain server. */
function isPackagedExe() {
    return path.basename(process.execPath).toLowerCase() !== 'node.exe' && path.basename(process.execPath).toLowerCase() !== 'node';
}
httpServer.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Tri-Ominos server listening on ${url}`);
    if (isPackagedExe()) {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    }
});
//# sourceMappingURL=index.js.map