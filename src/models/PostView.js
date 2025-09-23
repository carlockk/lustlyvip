import { Schema, model, models } from 'mongoose';

const PostViewSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  viewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  anonymousId: { type: String, default: null, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

const PostView = models.PostView || model('PostView', PostViewSchema);

export default PostView;

