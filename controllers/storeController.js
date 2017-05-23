const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed.' }, false);
    }
  }
}

exports.homePage = (req, res) => {
  res.render('index');
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug });
  if (!store) return next();
  res.render('store', { title: store.name, store })
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if (!req.file) {
    next(); // skip if there is no file to resize
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  // give photo unique ids
  req.body.photo = `${ uuid.v4() }.${ extension }`;
  // resize photo
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${ req.body.photo }`);
  next();
};

exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${ store.name }. Care to leave a review?` )
  res.redirect(`/store/${ store.slug }`);
};

exports.getStores = async (req, res) => {
  const stores = await (Store.find());
  res.render ('stores', { title: 'Stores', stores })
}

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id });
  // TODO: confirm user is owner of store
  res.render('editStore', { title: `Edit ${ store.name }`, store })
}

exports.updateStore = async (req, res) => {
  // re-set location data as point
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store
    runValidators: true,
  }).exec();
  req.flash('success', `Successfully updated <strong>${ store.name }</strong>! <a href="/stores/${ store.slug }">View Store</a>`)
  res.redirect(`/store/${ store._id }/edit`);
}

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  // if no tag, pass all tags
  const tagQuery = tag || { $exists: true };
  const tagPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores]= await Promise.all([tagPromise, storesPromise]);

  res.render('tags', { title: 'Tags', tags, tag, stores })
}


