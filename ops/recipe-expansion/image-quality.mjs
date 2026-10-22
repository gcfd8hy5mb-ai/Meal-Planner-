// Inspect actual WebP dimensions before accepting recipe-photo assets.
// Supports VP8, VP8L and VP8X; refuses unknown or corrupt image headers.
export function webpDimensions(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<30||buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WEBP')throw new Error('Invalid WebP file');
 const fourcc=buffer.toString('ascii',12,16);
 let width,height;
 if(fourcc==='VP8X'){width=1+buffer.readUIntLE(24,3);height=1+buffer.readUIntLE(27,3)}
 else if(fourcc==='VP8L'){
  if(buffer[20]!==0x2f)throw new Error('Invalid lossless WebP');
  const b1=buffer[21],b2=buffer[22],b3=buffer[23],b4=buffer[24];
  width=1+(((b2&0x3f)<<8)|b1);
  height=1+(((b4&0x0f)<<10)|(b3<<2)|(b2>>6));
 }else if(fourcc==='VP8 '){
  if(buffer.readUIntLE(23,3)!==0x2a019d)throw new Error('Invalid VP8 frame');
  width=buffer.readUInt16LE(26)&0x3fff;
  height=buffer.readUInt16LE(28)&0x3fff;
 }else throw new Error('Unsupported WebP encoding: '+fourcc);
 if(!width||!height)throw new Error('Invalid WebP dimensions');
 return {width,height};
}
export function assertPhotoQuality(buffer,{minWidth=640,minHeight=400}={}){
 const {width,height}=webpDimensions(buffer);
 if(width<minWidth||height<minHeight)throw new Error('Recipe photo too small: '+width+'x'+height+'; require at least '+minWidth+'x'+minHeight);
 if(buffer.length<12000||buffer.length>4000000)throw new Error('Unacceptable WebP file size');
 return {width,height,bytes:buffer.length};
}
