/**
 * Author: Brighy Jiji Abraham
 */
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://192.168.12.49:3001';
const socket = io(BACKEND_URL);

export default socket;
