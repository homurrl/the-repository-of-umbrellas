const router = require("express").Router();
const { Tag, Product, ProductTag } = require("../../models");

// The `/api/tags` endpoint

router.get("/", async (req, res) => {
  // find all tags
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findAll({ include: [{ model: Product }] });

    if (!tagData) {
      res.status(404).send("Tags not found");
      return;
    }
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/:id", async (req, res) => {
  // find a single tag by its `id`
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findOne({
      where: { id: req.params.id },
      include: [{ model: Product }],
    });

    if (!tagData) {
      res.status(404).send("Tag not found");
      return;
    }
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/", async (req, res) => {
  // create a new tag
  /* req.body should look like:
    {
      tag_name: "metal",
      productIds: [1, 2, 3]
    }
  */
  const allTags = await Tag.findAll();

  // check whether the new tag already exists
  for (let tag of allTags) {
    if (tag.tag_name === req.body.tag_name) {
      res.status(400).send("Tag alredy exists");
      return;
    }
  }

  const createdTag = await Tag.create(req.body);
  let createdProductTags;
  // if productIds were passed in the request body
  if (req.body.productIds.length) {
    // create a list of productId and tagId pairs to bulk create ProductTag junction tables
    const productTagIdArr = req.body.productIds.map((productId) => {
      return {
        tag_id: createdTag.id,
        productId,
      };
    });
    // create ProductTag tables
    createdProductTags = await ProductTag.bulkCreate(productTagIdArr);

    res.status(200).json(createdProductTags);
    return;
  }
  // if no productIds were passed, return
  res.status(200).json(createdTag);
});

router.put("/:id", async (req, res) => {
  /*
    req.body should look like:
    {
      "tag_name": "metal",
      "productIds": [1, 3, 4]
    }
  */
  try {
    // update a tag's name by its `id` value
    const updatedTag = await Tag.update(req.body, {
      where: { id: req.params.id },
    });

    if (!updatedTag) {
      res.status(404).send("No tags with that ID");
      return;
    }

    // update associated ProductTags based on new list of products associated with that tag
    const productTags = await ProductTag.findAll({
      where: { tag_id: req.params.id },
    });

    // get list of product ids that are associated with the product tags on the selected tag id
    const productTagIds = productTags.map(({ product_id }) => product_id);

    // create a list of product tags with the product_ids that didn't change
    const newProductTags = req.body.productIds
      .filter((product_id) => !productTagIds.includes(product_id))
      .map((product_id) => {
        return {
          tag_id: req.params.id,
          product_id,
        };
      });

    // find which ProductTags are no longer needed due to the tag not being associated with that product any longer
    const productTagIdsToRemove = productTags
      // for each product in the existing tags list, return only those that aren't in the updated productIds list
      .filter(({ product_id }) => !req.body.productIds.includes(product_id))
      .map(({ id }) => id);

    const updatedProductTags = await Promise.all([
      ProductTag.destroy({ where: { id: productTagIdsToRemove } }),
      ProductTag.bulkCreate(newProductTags),
    ]);

    res.status(200).json(updatedProductTags);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.delete("/:id", async (req, res) => {
  // delete on tag by its `id` value
  try {
    const deletedTag = await Tag.destroy({ where: { id: req.params.id } });
    if (!deletedTag) {
      res.status(404).send("Cannot find tag with that ID");
      return;
    }

    res.status(200).json(deletedTag);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;