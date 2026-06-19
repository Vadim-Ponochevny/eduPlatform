import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum ImageStatus {
  PROCESSING = 'processing',
  READY = 'ready',
}

@Schema({ _id: false })
export class ImageAsset {
  @Prop({ required: true })
  url: string;

  @Prop({ enum: ImageStatus, default: ImageStatus.PROCESSING })
  status: ImageStatus;
}

export const ImageAssetSchema = SchemaFactory.createForClass(ImageAsset);