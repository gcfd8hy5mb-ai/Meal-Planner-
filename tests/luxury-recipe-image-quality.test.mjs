import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPhotoQuality,webpDimensions} from '../ops/recipe-expansion/image-quality.mjs';
const vp8x=(width,height,bytes=20000)=>{
 const b=Buffer.alloc(bytes);b.write('RIFF',0,'ascii');b.writeUInt32LE(bytes-8,4);b.write('WEBPVP8X',8,'ascii');
 b.writeUInt32LE(10,16);b.writeUIntLE(width-1,24,3);b.writeUIntLE(height-1,27,3);return b;
};
test('reads pixel dimensions rather than relying on misleading filenames or file sizes',()=>{
 assert.deepEqual(webpDimensions(vp8x(720,480)),{width:720,height:480});
 assert.deepEqual(webpDimensions(vp8x(252,170)),{width:252,height:170});
});
test('rejects undersized 252x170 collage crops before acceptance',()=>{
 assert.throws(()=>assertPhotoQuality(vp8x(252,170)),/too small/);
 assert.doesNotThrow(()=>assertPhotoQuality(vp8x(1200,800)));
});
test('rejects invalid image headers',()=>assert.throws(()=>webpDimensions(Buffer.from('not an image')),/Invalid WebP/));
