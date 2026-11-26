import Conversation from '../models/conversation.model.js';
import Item from '../models/item.model.js';
import Message from '../models/message.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';

// Deleting something also removes what only made sense alongside it. Orders are always kept:
// they are the other person's history too, and carry their own copy of the title and picture.

// Items, their reviews, and their place in anybody's favourites.
export const deleteItemsAndTheirTraces = async (itemIds) => {
  const ids = itemIds.map(String);
  if (ids.length === 0) return;
  await Promise.all([
    Item.deleteMany({ _id: { $in: ids } }),
    Review.deleteMany({ itemId: { $in: ids } }),
    User.updateMany({ favourites: { $in: ids } }, { $pull: { favourites: { $in: ids } } }),
  ]);
};

// Everything a user leaves behind: their items, the reviews they wrote (taken back out of
// each item's rating), their votes on other reviews, and their conversations.
export const deleteUserAndTheirTraces = async (userId) => {
  const id = String(userId);

  const items = await Item.find({ userId: id }).select('_id');
  await deleteItemsAndTheirTraces(items.map((item) => item._id));

  const reviews = await Review.find({ userId: id });
  await Promise.all(
    reviews.map((review) =>
      Item.findByIdAndUpdate(review.itemId, {
        $inc: { totalStars: -review.star, starNumber: -1 },
      })
    )
  );
  await Review.deleteMany({ userId: id });
  await Review.updateMany(
    { $or: [{ helpful: id }, { notHelpful: id }] },
    { $pull: { helpful: id, notHelpful: id } }
  );

  const conversations = await Conversation.find({
    $or: [{ sellerId: id }, { buyerId: id }],
  }).select('id');
  const conversationIds = conversations.map((conversation) => conversation.id);
  await Message.deleteMany({ conversationId: { $in: conversationIds } });
  await Conversation.deleteMany({ id: { $in: conversationIds } });

  await User.findByIdAndDelete(id);
};
