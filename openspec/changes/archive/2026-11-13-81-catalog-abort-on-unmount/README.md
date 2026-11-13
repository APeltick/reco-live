# 81-catalog-abort-on-unmount

Bug fix (issue #81): the in-flight products request is aborted when the catalog page unmounts, so a stale response never overwrites the list after leaving `/product` and coming back.
