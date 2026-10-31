import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
} from "mongoose";

const userSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    timezone: { type: String, required: true, default: "UTC" },
    tokenVersion: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
