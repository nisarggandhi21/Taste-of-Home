import Item from "../models/item.model.js";
import createError from "../utils/createError.js";

export const createItem = async (req, res, next) => {
  if (!req.isSeller) return next(createError("You are not a seller", 403));

  const newItem = new Item({
    userId: req.userId,
    ...req.body,
  });

  try {
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (item.userId !== req.userId) {
      return next(createError("You can delete only your item", 403));
    }

    await Item.findByIdAndDelete(req.params.id);
    res.status(200).send("deleted");
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) next(createError(404, "Item not found!"));
    res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req, res, next) => {
  const q = req.query;
  // const filters = {
  //   ...(query.userId && { userId: query.userId }),
  //   ...(query.cat && {
  //     cat: { $regex: query.cat, $options: "i" },
  //   }),
  //   ...((query.min || query.max) && {
  //     price: {
  //       ...(query.min && { $gt: query.min }),
  //       ...(query.max && { $lt: query.max }),
  //     },
  //   }),
  //   ...(query.title && {
  //     title: { $regex: query.title, $options: "i" },
  //   }),
  // };
  const filters = {
    ...(q.userId && { userId: q.userId }),
    ...(q.cat && { cat: { $regex: q.cat, $options: "i" } }),
    ...((q.min || q.max) && {
      price: {
        ...(q.min && { $gt: q.min }),
        ...(q.max && { $lt: q.max }),
      },
    }),
    ...(q.search && { title: { $regex: q.search, $options: "i" } }),
  };

  try {
    const items = await Item.find(filters).sort({ [q.sort]: -1 });
    res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};
